"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import { useTexture } from "@react-three/drei";

/**
 * MountainLandscape — sunset-rim-lit four-layer canyon, v2.
 *
 *   Layer 1 (z 25 → -110):  jagged inner-face ridges flanking the camera.
 *                           Custom BufferGeometry, double-sided, very dark
 *                           so the warm horizon silhouettes them.
 *   Layer 2 (z -80 → -150): mid-distance peaks, scattered cones.
 *   Layer 3 (z -150 → -220): far peaks, deeper-warm tone (atmospheric
 *                            perspective bringing them toward sky color).
 *   Layer 4 (z -250 → -300): horizon range — large, low-detail, almost
 *                            merged with the warm horizon glow.
 *
 * v2 changes vs v1:
 *   • Materials darken further — sunset wants silhouette, not mid-tone.
 *   • Foreground ridge tessellation 80 → 128 segments for richer
 *     silhouette detail when the sun rim-lights the top edge.
 *   • Ridge geometry now includes UVs so a procedurally-generated rocky
 *     normal map (DataTexture, no external asset) can disturb surface
 *     micro-detail and respond to the HDRI environment lighting.
 *   • Mid/far/horizon cones share the procedural normal map for surface
 *     coherence across layers.
 *
 * RIDGES (layer 1):
 *   Two faces — inner (visible to camera, slopes from inner-base up to
 *   peak) and outer (back of ridge). Trees in tree-forest.tsx are placed
 *   using the same noise function so they sit ON the ridge surface.
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
  segments: 128,
} as const;

export type RidgeSampleResult = {
  z: number;
  xInner: number;
  xOuter: number;
  peakX: number;
  peakY: number;
};

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

  // 4 octaves of noise → sharper, taller PNW-alpine silhouette.
  // Higher base + bigger octave-1 amplitude makes the ridges feel
  // genuinely vertical rather than rolling. Octave 4 adds the high-frequency
  // "broken" feel of real granite.
  const h1 = noise2(t * 3, seed * 0.007) * 0.5 + 0.5;
  const h2 = noise2(t * 8, seed * 0.013) * 0.5 + 0.5;
  const h3 = noise2(t * 16, seed * 0.021) * 0.5 + 0.5;
  const h4 = noise2(t * 32, seed * 0.031) * 0.5 + 0.5;
  const peakY = 14 + h1 * 9 + h2 * 3.5 + h3 * 1.4 + h4 * 0.6;

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
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const s = sampleRidge(side, seed, t);
    // Three vertices per cross-section: inner-base (0), peak (1), outer-base (2).
    positions.push(s.xInner, 0, s.z);
    positions.push(s.peakX, s.peakY, s.z);
    positions.push(s.xOuter, 0, s.z);

    // UVs — u walks along ridge length, v walks 0 (base) → 1 (peak).
    // Repeat u every 8 segments so the rock detail texture tiles densely.
    const u = (i / segments) * 16;
    uvs.push(u, 0); // inner base
    uvs.push(u, 1); // peak
    uvs.push(u, 0); // outer base
  }

  for (let i = 0; i < segments; i++) {
    const base = i * 3;
    const next = (i + 1) * 3;

    // Inner face (visible to camera) — winding for inward-facing normals.
    indices.push(base + 0, base + 1, next + 1);
    indices.push(base + 0, next + 1, next + 0);

    // Outer face (back of ridge) — winding mirrored for outward normals.
    indices.push(base + 1, base + 2, next + 2);
    indices.push(base + 1, next + 2, next + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Build a tileable rocky normal map procedurally — no external asset.
 * Two octaves of simplex 2D noise, sampled as a height field, then
 * gradient-differenced to produce per-pixel normals. Tangent-space
 * convention: R=X, G=Y, B=Z (≈0.8 const for "mostly facing camera").
 */
function createProceduralRockNormal(size = 256, seed = 4242): THREE.DataTexture {
  const noise = createNoise2D(mulberry32(seed));
  const data = new Uint8Array(size * size * 4);

  const height = (x: number, y: number) => {
    // Two octaves — coarse + fine — wrap-safe by sampling sin/cos to make tileable.
    const u = (x / size) * Math.PI * 2;
    const v = (y / size) * Math.PI * 2;
    const c1 = Math.cos(u);
    const s1 = Math.sin(u);
    const c2 = Math.cos(v);
    const s2 = Math.sin(v);
    const a = noise(c1 * 1.4, s1 * 1.4) + noise(c2 * 1.4, s2 * 1.4);
    const b = noise(c1 * 4.2 + 17, s1 * 4.2 + 11) + noise(c2 * 4.2 + 7, s2 * 4.2 + 5);
    return a * 0.7 + b * 0.35;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Central differences for the gradient — strength controls bumpiness.
      const strength = 0.55;
      const dx = (height((x + 1) % size, y) - height((x - 1 + size) % size, y)) * strength;
      const dy = (height(x, (y + 1) % size) - height(x, (y - 1 + size) % size)) * strength;
      // Normal in tangent space: encoded into [0..1] then scaled to 0..255.
      const nx = -dx * 0.5 + 0.5;
      const ny = -dy * 0.5 + 0.5;
      const nz = 0.85;
      data[i + 0] = Math.max(0, Math.min(255, Math.round(nx * 255)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round(ny * 255)));
      data[i + 2] = Math.max(0, Math.min(255, Math.round(nz * 255)));
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

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
    const sign = rand() > 0.5 ? 1 : -1;
    const xMag = centerKeepout + rand() * (xRange - centerKeepout);
    const x = sign * xMag;
    const height = THREE.MathUtils.lerp(heightMin, heightMax, rand());
    const radius = height * radiusFactor;
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
  const rockNormal = useMemo(() => createProceduralRockNormal(256, 4242), []);

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

  // Real PolyHaven CC0 PBR rock textures — used by foreground + mid ridges.
  // Far/horizon stay procedural; they're too distant for texture detail
  // to matter, and the atmospheric scattering shader collapses them
  // toward sky color anyway.
  const ridgeTextures = useTexture({
    map: "/textures/rock/rock_face_03_diff_2k.jpg",
    normalMap: "/textures/rock/rock_face_03_nor_gl_2k.jpg",
    roughnessMap: "/textures/rock/rock_face_03_rough_2k.jpg",
    aoMap: "/textures/rock/rock_face_03_ao_2k.jpg",
  });

  // Materials per layer. Photoreal direction — foreground/mid use PBR
  // texture set; far/horizon use procedural normal + atmospheric
  // scattering injection.
  const groundMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#070A0C",
        roughness: 1.0,
        metalness: 0.0,
      }),
    []
  );
  const ridgeMat = useMemo(() => {
    [ridgeTextures.map, ridgeTextures.normalMap, ridgeTextures.roughnessMap, ridgeTextures.aoMap].forEach(
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(8, 1);
        tex.anisotropy = 8;
      }
    );
    const m = new THREE.MeshStandardMaterial({
      map: ridgeTextures.map,
      normalMap: ridgeTextures.normalMap,
      normalScale: new THREE.Vector2(1.6, 1.6),
      roughnessMap: ridgeTextures.roughnessMap,
      aoMap: ridgeTextures.aoMap,
      aoMapIntensity: 0.85,
      roughness: 1.0,
      metalness: 0.05,
      side: THREE.DoubleSide,
      // Cool tint pulls the rock toward the morning sky color.
      color: "#8AA0A8",
    });
    // Snow caps — inject world-space Y and normal-up varyings, then
    // blend toward white snow albedo when (a) altitude is high enough
    // AND (b) the surface is roughly up-facing. No extra geometry.
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uSnowAltitude = { value: 18.0 };
      shader.uniforms.uSnowAltitudeRange = { value: 4.0 };
      shader.uniforms.uSnowSlopeBias = { value: 0.65 };

      shader.vertexShader =
        "varying vec3 vWorldPosNormal;\nvarying float vWorldY;\n" +
        shader.vertexShader.replace(
          "#include <fog_vertex>",
          `
            #include <fog_vertex>
            vec4 wp = modelMatrix * vec4(transformed, 1.0);
            vWorldY = wp.y;
            vWorldPosNormal = normalize(mat3(modelMatrix) * objectNormal);
          `
        );

      shader.fragmentShader =
        "uniform float uSnowAltitude;\nuniform float uSnowAltitudeRange;\nuniform float uSnowSlopeBias;\nvarying vec3 vWorldPosNormal;\nvarying float vWorldY;\n" +
        shader.fragmentShader.replace(
          "#include <fog_fragment>",
          `
            float altMix = smoothstep(uSnowAltitude - uSnowAltitudeRange, uSnowAltitude + uSnowAltitudeRange, vWorldY);
            float slopeMix = smoothstep(uSnowSlopeBias, 1.0, vWorldPosNormal.y);
            float snow = altMix * slopeMix;
            vec3 snowAlbedo = vec3(0.96, 0.96, 0.94);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, snowAlbedo, snow * 0.85);
            #include <fog_fragment>
          `
        );
    };
    return m;
  }, [ridgeTextures]);
  const midMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: ridgeTextures.map,
      normalMap: ridgeTextures.normalMap,
      normalScale: new THREE.Vector2(0.9, 0.9),
      roughnessMap: ridgeTextures.roughnessMap,
      roughness: 1.0,
      metalness: 0.0,
      // Cooler/darker tint shifts mid distance away from foreground.
      color: "#5A7078",
    });
  }, [ridgeTextures]);
  const farMat = useMemo(() => {
    const n = rockNormal.clone();
    n.repeat.set(2, 2);
    n.wrapS = n.wrapT = THREE.RepeatWrapping;
    n.needsUpdate = true;
    const m = new THREE.MeshStandardMaterial({
      color: "#2F4A4A",
      roughness: 0.92,
      metalness: 0.0,
      normalMap: n,
      normalScale: new THREE.Vector2(0.6, 0.6),
      flatShading: false,
    });
    // Atmospheric scattering — distant ridges desaturate toward sky tint
    // so they read as real aerial perspective, not flat color.
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uSkyTint = { value: new THREE.Color("#7E9AAE") };
      shader.uniforms.uScatterStart = { value: 80.0 };
      shader.uniforms.uScatterEnd = { value: 260.0 };
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <fog_fragment>",
        `
          #include <fog_fragment>
          float dist = length(vViewPosition);
          float scatter = smoothstep(uScatterStart, uScatterEnd, dist);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uSkyTint, scatter * 0.8);
        `
      );
      shader.fragmentShader =
        "uniform vec3 uSkyTint;\nuniform float uScatterStart;\nuniform float uScatterEnd;\n" +
        shader.fragmentShader;
    };
    return m;
  }, [rockNormal]);
  const horizonMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: "#3A5060",
      roughness: 0.9,
      metalness: 0.0,
      flatShading: true,
    });
    // Heavier scattering on the horizon range — these peaks should mostly
    // dissolve into the sky color.
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uSkyTint = { value: new THREE.Color("#9CB2C2") };
      shader.uniforms.uScatterStart = { value: 180.0 };
      shader.uniforms.uScatterEnd = { value: 320.0 };
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <fog_fragment>",
        `
          #include <fog_fragment>
          float dist = length(vViewPosition);
          float scatter = smoothstep(uScatterStart, uScatterEnd, dist);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uSkyTint, scatter * 0.95);
        `
      );
      shader.fragmentShader =
        "uniform vec3 uSkyTint;\nuniform float uScatterStart;\nuniform float uScatterEnd;\n" +
        shader.fragmentShader;
    };
    return m;
  }, []);

  return (
    <group name="mountain-landscape">
      {/* Valley floor — flat near-black plane, sits at y=0 across the scene. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, -100]}
        material={groundMat}
        receiveShadow
      >
        <planeGeometry args={[600, 500]} />
      </mesh>

      {/* Layer 1 — foreground ridges (custom geometry, tree-bearing). */}
      <group name="layer-1-foreground">
        <mesh geometry={leftRidge} material={ridgeMat} castShadow receiveShadow />
        <mesh geometry={rightRidge} material={ridgeMat} castShadow receiveShadow />
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
