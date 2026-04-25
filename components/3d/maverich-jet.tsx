"use client";

import { useFrame } from "@react-three/fiber";
import { Text, Sparkles } from "@react-three/drei";
import { useMemo, useRef, forwardRef } from "react";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";

/**
 * MaverichJet — F/A-18-class swept-wing fighter, v2 PBR upgrade.
 *
 * v2 changes vs v1 (procedural fallback path — no external GLB sourced):
 *   • Procedurally-generated panel-line normal map → fuselage and wings
 *     have plate-line micro-detail that catches the HDRI sunset env
 *     reflection. Reads as armored skin instead of solid plastic.
 *   • Metallic-roughness retuned: fuselage now metalness=0.65,
 *     roughness=0.4 — close to a brushed-metal aircraft skin.
 *   • Canopy: high metalness, low roughness, slight emissive amber for
 *     the sun-glint-on-canopy beat (Brief §3 "sun glint on the cockpit").
 *   • Afterburners scaled up; emissive color shifts from amber-gold to
 *     hotter orange-to-white at peak burner (driven by glowIntensityRef).
 *   • Twin amber point lights (kept from v1) layered with the new bloom
 *     post-effect — the engine glow gets a luminous halo.
 *
 * Orientation: nose points along +Z so the camera at +Z looks straight at
 * the fuselage front. Jet group children stay at parent-local origin; the
 * parent scene moves the whole group via lerp in HeroAnimator.
 */

// PRNG — match the seeds used by mountain-landscape so HMR stays stable.
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Procedural panel-line normal map. Two passes:
 *   1. Rectangular plate boundaries — soft step lines at regular intervals
 *      across u + v. These read as the seam between hull plates.
 *   2. Subtle simplex noise — micro-scratches/wear, breaks up the regular
 *      grid so the surface doesn't read as wallpaper.
 *
 * The resulting tangent-space normal map mostly preserves the surface
 * normal (high B channel ≈ 0.9) with low-amplitude X/Y deviations at
 * panel edges and noise highs.
 */
function createPanelLineNormal(size = 256, seed = 7777): THREE.DataTexture {
  const noise = createNoise2D(mulberry32(seed));
  const data = new Uint8Array(size * size * 4);

  // Soft-step at panel edges so the normal disturbance is local.
  const lineMask = (coord: number, period: number, sharpness: number) => {
    const f = ((coord % period) + period) % period;
    const dist = Math.min(f, period - f);
    return Math.exp(-Math.pow(dist * sharpness, 2));
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const u = x / size;
      const v = y / size;

      // Two grid frequencies — large plates (u/v 0.25), small plates (0.0833).
      const horizLarge = lineMask(u, 0.25, 60);
      const vertLarge = lineMask(v, 0.25, 60);
      const horizSmall = lineMask(u, 1 / 12, 90) * 0.5;
      const vertSmall = lineMask(v, 1 / 12, 90) * 0.5;

      // Panel-line gradient → normal disturbance pointing outward.
      const dx = (vertLarge + vertSmall) * 0.6;
      const dy = (horizLarge + horizSmall) * 0.6;

      // Sub-millimeter wear.
      const n1 = noise(x * 0.06, y * 0.06) * 0.12;

      const nx = -(dx + n1) * 0.5 + 0.5;
      const ny = -(dy + n1) * 0.5 + 0.5;
      const nz = 0.92;
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

/**
 * Roughness map — slightly varied per UV so reflections aren't perfectly
 * uniform across the airframe. Low contrast — we want a metallic feel,
 * just not a chrome-mirror feel.
 */
function createRoughnessMap(size = 128, seed = 9999): THREE.DataTexture {
  const noise = createNoise2D(mulberry32(seed));
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = (noise(x * 0.04, y * 0.04) + 1) * 0.5;
      // Roughness range 0.32 → 0.55 — within "brushed metal" band.
      const r = 0.32 + n * 0.23;
      const v = Math.round(r * 255);
      data[i + 0] = v;
      data[i + 1] = v;
      data[i + 2] = v;
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

type Props = {
  glowIntensityRef?: React.MutableRefObject<number>;
};

export const MaverichJet = forwardRef<THREE.Group, Props>(function MaverichJet(
  { glowIntensityRef },
  ref
) {
  const burnerLeft = useRef<THREE.MeshStandardMaterial>(null);
  const burnerRight = useRef<THREE.MeshStandardMaterial>(null);
  const burnerLightLeft = useRef<THREE.PointLight>(null);
  const burnerLightRight = useRef<THREE.PointLight>(null);

  // Procedural maps shared by all body panels.
  const panelNormal = useMemo(() => createPanelLineNormal(256, 7777), []);
  const roughnessMap = useMemo(() => createRoughnessMap(128, 9999), []);

  // Body material — brushed armored metal. metalness high, roughness in
  // the brushed band, panel-line normals for surface detail.
  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1A1B20",
        metalness: 0.65,
        roughness: 0.42,
        normalMap: panelNormal,
        normalScale: new THREE.Vector2(0.55, 0.55),
        roughnessMap,
        envMapIntensity: 1.4,
      }),
    [panelNormal, roughnessMap]
  );

  // Wing leading-edge material — slightly lighter, slightly less rough
  // so the sun catches a bright rim along the leading edge during the
  // overhead pass.
  const wingMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#23252C",
        metalness: 0.7,
        roughness: 0.35,
        normalMap: panelNormal,
        normalScale: new THREE.Vector2(0.45, 0.45),
        envMapIntensity: 1.6,
      }),
    [panelNormal]
  );

  // Cockpit canopy — smoked-glass with a faint amber emissive so the
  // bloom pass picks up the sun-glint-on-canopy moment from Brief §3.
  const canopyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0F1A2A",
        metalness: 0.85,
        roughness: 0.08,
        emissive: "#FFA855",
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.88,
        envMapIntensity: 2.0,
      }),
    []
  );

  // Intake duct — black interior, low metalness so it stays a hole in
  // the silhouette.
  const intakeMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#050507",
        side: THREE.DoubleSide,
      }),
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const base = glowIntensityRef?.current ?? 2.5;
    const pulse = Math.sin(t * 3) * 0.3;
    const intensity = base + pulse;
    if (burnerLeft.current) burnerLeft.current.emissiveIntensity = intensity;
    if (burnerRight.current) burnerRight.current.emissiveIntensity = intensity;
    const lightIntensity = 0.4 + base * 0.35 + pulse * 0.1;
    if (burnerLightLeft.current)
      burnerLightLeft.current.intensity = lightIntensity;
    if (burnerLightRight.current)
      burnerLightRight.current.intensity = lightIntensity;
  });

  return (
    <group ref={ref}>
      {/* Fuselage — centered box, length 4 along Z (z: -2 to +2) */}
      <mesh material={bodyMat}>
        <boxGeometry args={[0.7, 0.6, 4]} />
      </mesh>

      {/* Nose cone — tapers forward into +Z */}
      <mesh
        position={[0, 0, 2.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={bodyMat}
      >
        <coneGeometry args={[0.35, 1, 16]} />
      </mesh>

      {/* Cockpit canopy — top half-sphere, elongated along the fuselage */}
      <mesh
        position={[0, 0.3, 1.0]}
        scale={[1, 1, 1.6]}
        material={canopyMat}
      >
        <sphereGeometry
          args={[0.4, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
      </mesh>

      {/* Pilot silhouette — capsule visible inside the canopy */}
      <mesh position={[0, 0.32, 1.0]}>
        <capsuleGeometry args={[0.11, 0.18, 4, 8]} />
        <meshStandardMaterial color="#0A0A0B" roughness={0.9} />
      </mesh>

      {/* Main wings — swept ~25° back, 5° anhedral droop on tips */}
      <mesh
        position={[-1.65, -0.05, -0.2]}
        rotation={[0, -0.43, 0.09]}
        material={wingMat}
      >
        <boxGeometry args={[2.6, 0.05, 1.4]} />
      </mesh>
      <mesh
        position={[1.65, -0.05, -0.2]}
        rotation={[0, 0.43, -0.09]}
        material={wingMat}
      >
        <boxGeometry args={[2.6, 0.05, 1.4]} />
      </mesh>

      {/* Horizontal tail stabilizers */}
      <mesh
        position={[-0.85, -0.05, -1.7]}
        rotation={[0, -0.5, 0]}
        material={wingMat}
      >
        <boxGeometry args={[1.2, 0.05, 0.6]} />
      </mesh>
      <mesh
        position={[0.85, -0.05, -1.7]}
        rotation={[0, 0.5, 0]}
        material={wingMat}
      >
        <boxGeometry args={[1.2, 0.05, 0.6]} />
      </mesh>

      {/* Twin vertical stabilizers — F/A-18 twin tails, canted outward 12° */}
      <mesh
        position={[-0.3, 0.55, -1.4]}
        rotation={[0, 0, -0.21]}
        material={bodyMat}
      >
        <boxGeometry args={[0.05, 0.85, 0.7]} />
      </mesh>
      <mesh
        position={[0.3, 0.55, -1.4]}
        rotation={[0, 0, 0.21]}
        material={bodyMat}
      >
        <boxGeometry args={[0.05, 0.85, 0.7]} />
      </mesh>

      {/* Engine intakes — dark interior */}
      <mesh
        position={[-0.5, -0.18, 0.4]}
        rotation={[Math.PI / 2, 0, 0]}
        material={intakeMat}
      >
        <cylinderGeometry args={[0.18, 0.18, 0.5, 16, 1, true]} />
      </mesh>
      <mesh
        position={[0.5, -0.18, 0.4]}
        rotation={[Math.PI / 2, 0, 0]}
        material={intakeMat}
      >
        <cylinderGeometry args={[0.18, 0.18, 0.5, 16, 1, true]} />
      </mesh>

      {/* Twin afterburners — emissive cones pointing rearward (-Z) */}
      <mesh position={[-0.3, 0, -2.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.16, 0.5, 16]} />
        <meshStandardMaterial
          ref={burnerLeft}
          attach="material"
          color="#1A0A05"
          emissive="#FFB347"
          emissiveIntensity={2.5}
          roughness={0.7}
        />
      </mesh>
      <mesh position={[0.3, 0, -2.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.16, 0.5, 16]} />
        <meshStandardMaterial
          ref={burnerRight}
          attach="material"
          color="#1A0A05"
          emissive="#FFB347"
          emissiveIntensity={2.5}
          roughness={0.7}
        />
      </mesh>

      {/* Hot-glow halos behind the burners — point lights for soft bloom */}
      <pointLight
        ref={burnerLightLeft}
        position={[-0.3, 0, -2.5]}
        color="#FFB347"
        intensity={1.2}
        distance={6}
      />
      <pointLight
        ref={burnerLightRight}
        position={[0.3, 0, -2.5]}
        color="#FFB347"
        intensity={1.2}
        distance={6}
      />

      {/* M call-sign — front of fuselage, between the intakes, facing +Z.
          Outline color is the brand amber so bloom catches the rim. */}
      <Text
        position={[0, -0.05, 2.01]}
        fontSize={0.32}
        color="#F5F2EC"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.012}
        outlineColor="#E8B547"
        letterSpacing={-0.04}
      >
        M
      </Text>

      {/* Wingtip vapor vortices — amber-tinted Sparkles emitting from each
          wingtip. Active during the pass-over; they fade naturally as the
          camera leaves the close-up. */}
      <Sparkles
        position={[-2.85, -0.05, -0.4]}
        count={36}
        scale={[0.6, 0.3, 1.6]}
        size={2.4}
        speed={0.4}
        color="#FFE4B5"
        opacity={0.7}
      />
      <Sparkles
        position={[2.85, -0.05, -0.4]}
        count={36}
        scale={[0.6, 0.3, 1.6]}
        size={2.4}
        speed={0.4}
        color="#FFE4B5"
        opacity={0.7}
      />
    </group>
  );
});
