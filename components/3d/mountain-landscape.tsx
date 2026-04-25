"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";

/**
 * MountainLandscape — four-layer receding valley with two custom-geometry
 * foreground ridges and three depth-graded cone-peak layers.
 *
 *   Layer 1 (z 25 → -110):  jagged inner-face ridges flanking the camera.
 *                           Custom BufferGeometry, double-sided, darkest.
 *   Layer 2 (z -80 → -150): mid-distance peaks, scattered cones.
 *   Layer 3 (z -150 → -220): far peaks, lighter so atmospheric perspective
 *                            reads correctly when fog blends them.
 *   Layer 4 (z -250 → -300): horizon range — large, low-detail, almost
 *                            merged with sunrise sky color via fog.
 *
 * All layers are static in world space — only the camera moves, so layered
 * parallax is implicit. Each layer is its own <group> so a perf pass can
 * toggle individual layers off via env flag if needed.
 *
 * RIDGES (layer 1):
 *   Constructed as a triangulated wall whose top edge is driven by 3 octaves
 *   of 1D simplex noise (sampled along Z). Two faces — inner (visible to
 *   camera, slopes from inner-base up to peak) and outer (back of ridge).
 *   Trees in tree-forest.tsx are placed using the same noise function so
 *   they sit ON the ridge surface, not floating above it.
 */

// Mulberry32 PRNG for deterministic mountain placement across HMR / SSR.
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Public helper — tree-forest re-uses these so trees sit on actual ridge
// surface. Keep RIDGE_PARAMS in sync between the two files via this export.
export const RIDGE_PARAMS = {
  zNear: 25,
  zFar: -110,
  xInnerNear: 12,
  xInnerFar: 16,
  xOuterNear: 30,
  xOuterFar: 35,
  segments: 80,
} as const;

export type RidgeSampleResult = {
  z: number;
  xInner: number;
  xOuter: number;
  peakX: number;
  peakY: number;
};

/**
 * Sample the ridge silhouette at parameter t in [0, 1]. Used by both the
 * ridge geometry builder and the tree-placement code so trees stay glued
 * to the surface they're supposedly growing on.
 *
 * `side` controls reflection: peakX comes back signed (negative for left
 * ridge) so callers can plug it directly into world coordinates.
 */
export function sampleRidge(
  side: "left" | "right",
  seed: number,
  t: number
): RidgeSampleResult {
  const noise2 = createNoise2D(mulberry32(seed));
  const sign = side === "left" ? -1 : 1;
  const z = THREE.MathUtils.lerp(RIDGE_PARAMS.zNear, RIDGE_PARAMS.zFar, t);
  const xInnerAbs = THREE.MathUtils.lerp(
    RIDGE_PARAMS.xInnerNear,
    RIDGE_PARAMS.xInnerFar,
    t
  );
  const xOuterAbs = THREE.MathUtils.lerp(
    RIDGE_PARAMS.xOuterNear,
    RIDGE_PARAMS.xOuterFar,
    t
  );
  const peakOffset = (noise2(t * 4, seed * 0.01) + 1) * 0.5;
  const peakXAbs = THREE.MathUtils.lerp(
    xInnerAbs + 2,
    xOuterAbs - 3,
    peakOffset
  );

  // 3 octaves of noise → jagged silhouette
  const h1 = noise2(t * 3, seed * 0.007) * 0.5 + 0.5;
  const h2 = noise2(t * 8, seed * 0.013) * 0.5 + 0.5;
  const h3 = noise2(t * 16, seed * 0.021) * 0.5 + 0.5;
  const peakY = 8 + h1 * 6 + h2 * 2.5 + h3 * 1.0;

  return {
    z,
    xInner: sign * xInnerAbs,
    xOuter: sign * xOuterAbs,
    peakX: sign * peakXAbs,
    peakY,
  };
}

function createRidgeGeometry(
  side: "left" | "right",
  seed: number
): THREE.BufferGeometry {
  const segments = RIDGE_PARAMS.segments;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const s = sampleRidge(side, seed, t);
    // Three vertices per cross-section: inner-base, peak, outer-base.
    positions.push(s.xInner, 0, s.z); // 0
    positions.push(s.peakX, s.peakY, s.z); // 1
    positions.push(s.xOuter, 0, s.z); // 2
  }

  for (let i = 0; i < segments; i++) {
    const base = i * 3;
    const next = (i + 1) * 3;

    // Inner face (visible to camera) — winding chosen so normals face inward.
    indices.push(base + 0, base + 1, next + 1);
    indices.push(base + 0, next + 1, next + 0);

    // Outer face (back of ridge) — winding mirrored so normals face outward.
    indices.push(base + 1, base + 2, next + 2);
    indices.push(base + 1, next + 2, next + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Scatter peaks (cones) within a band — push outward so the valley center
// stays open and the camera sightline isn't blocked.
type PeakSpec = {
  position: [number, number, number];
  height: number;
  radius: number;
  segments: number;
};

function generatePeaks(
  seed: number,
  count: number,
  zNear: number,
  zFar: number,
  xRange: number,
  centerKeepout: number,
  heightMin: number,
  heightMax: number,
  radiusFactor: number,
  segments: number
): PeakSpec[] {
  const rand = mulberry32(seed);
  const peaks: PeakSpec[] = [];
  for (let i = 0; i < count; i++) {
    const z = THREE.MathUtils.lerp(zNear, zFar, rand());
    // Pick x sign first, then bias outward to keep the valley center clear.
    const sign = rand() > 0.5 ? 1 : -1;
    const xMag = centerKeepout + rand() * (xRange - centerKeepout);
    const x = sign * xMag;
    const height = THREE.MathUtils.lerp(heightMin, heightMax, rand());
    const radius = height * radiusFactor;
    // Cone is centered at its midpoint by default — lift so base sits at y=0.
    peaks.push({
      position: [x, height / 2, z],
      height,
      radius,
      segments,
    });
  }
  return peaks;
}

export function MountainLandscape() {
  const leftRidge = useMemo(() => createRidgeGeometry("left", 1337), []);
  const rightRidge = useMemo(() => createRidgeGeometry("right", 9001), []);

  const midPeaks = useMemo(
    () => generatePeaks(2024, 6, -80, -150, 55, 18, 12, 25, 0.55, 8),
    []
  );
  const farPeaks = useMemo(
    () => generatePeaks(2025, 9, -150, -220, 80, 22, 18, 35, 0.6, 6),
    []
  );
  const horizonPeaks = useMemo(
    () => generatePeaks(2026, 14, -250, -300, 120, 28, 25, 50, 0.7, 5),
    []
  );

  // Materials shared per layer — fewer state changes, easier to tune.
  const groundMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#0F0B08", roughness: 0.95 }),
    []
  );
  const ridgeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1F1612",
        roughness: 0.95,
        flatShading: true,
        side: THREE.DoubleSide,
      }),
    []
  );
  const midMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2A1F18",
        roughness: 0.9,
        flatShading: true,
      }),
    []
  );
  const farMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#3D2E22",
        roughness: 0.85,
        flatShading: true,
      }),
    []
  );
  const horizonMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#5C3920",
        roughness: 0.85,
        flatShading: true,
      }),
    []
  );

  return (
    <group name="mountain-landscape">
      {/* Valley floor — flat dark plane. Sits at y=0 across the visible scene. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, -100]}
        material={groundMat}
      >
        <planeGeometry args={[600, 500]} />
      </mesh>

      {/* Layer 1 — foreground ridges (custom geometry, tree-bearing). */}
      <group name="layer-1-foreground">
        <mesh geometry={leftRidge} material={ridgeMat} />
        <mesh geometry={rightRidge} material={ridgeMat} />
      </group>

      {/* Layer 2 — mid-distance peaks. */}
      <group name="layer-2-mid">
        {midPeaks.map((p, i) => (
          <mesh key={`m${i}`} position={p.position} material={midMat}>
            <coneGeometry args={[p.radius, p.height, p.segments]} />
          </mesh>
        ))}
      </group>

      {/* Layer 3 — far peaks. */}
      <group name="layer-3-far">
        {farPeaks.map((p, i) => (
          <mesh key={`f${i}`} position={p.position} material={farMat}>
            <coneGeometry args={[p.radius, p.height, p.segments]} />
          </mesh>
        ))}
      </group>

      {/* Layer 4 — horizon range. Large but heavily fog-faded toward sky. */}
      <group name="layer-4-horizon">
        {horizonPeaks.map((p, i) => (
          <mesh key={`h${i}`} position={p.position} material={horizonMat}>
            <coneGeometry args={[p.radius, p.height, p.segments]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
