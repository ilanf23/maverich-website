"use client";

import { useFrame } from "@react-three/fiber";
import { Sparkles, useGLTF } from "@react-three/drei";
import { forwardRef, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * MaverichJet — F/A-18 Hornet, real GLB asset (Phase 4.2.14).
 *
 * Replaces the earlier procedural box-and-cone assembly with a real
 * F/A-18 Hornet glTF model from Sketchfab user cs09736 (CC-BY-SA-4.0,
 * attribution in the site footer).
 *
 * The GLB is loaded via Drei's useGLTF — one shared cache across the
 * page so the persistent jet doesn't re-allocate on every mount. We
 * clone the scene for the actual mesh so per-instance state (matrix,
 * material clones) doesn't bleed into the cache.
 *
 * Three things sit on TOP of the loaded model:
 *
 *   1. M call-sign (Drei <Text>) — anchored to the front of the
 *      fuselage based on the model's bounding box. Maverich brand mark.
 *   2. Twin afterburner emissive cones + amber point lights — anchored
 *      at the model's rear engine positions (also bounding-box-derived).
 *      These pulse + ramp via glowIntensityRef from the parent scene.
 *   3. Wingtip vapor sparkles — anchored at the model's wing tips.
 *
 * Auto-orient/auto-scale: the GLB's native coordinate system + scale
 * are unknown without inspection. We measure the bounding box at
 * mount, scale uniformly so the longest dimension matches a target
 * fuselage length, then apply a configurable rotation offset so the
 * nose points along +Z (the scene's "forward" convention) regardless
 * of how the source model was authored.
 */

// Drei caches the parsed model under this URL. preload kicks the
// download off as soon as this module first imports — useful because
// LoadingScreen's useProgress reports progress from this same loader.
useGLTF.preload("/models/fa18.glb");

// Target fuselage length in scene units. The intro/section keyframes
// in persistent-scene.tsx were authored against a 4-unit jet; this
// preserves the camera-fits-jet-in-frame composition.
const TARGET_LENGTH = 4.0;

// Source model's nose-axis is empirically along -Z (most Blender
// exports use -Z forward). We rotate +π around Y to flip nose to +Z.
// If the silhouette comes in upside down or backwards on first load,
// adjust this single Euler vector — every brand decoration anchors
// off the rotated bounding box, so nothing else needs touching.
const MODEL_ROTATION: [number, number, number] = [0, Math.PI, 0];

type Props = {
  glowIntensityRef?: React.MutableRefObject<number>;
};

type ModelMetrics = {
  scale: number;
  /** Bounds in *scaled* local space (after the auto-scale applied). */
  noseZ: number;     // forward edge of fuselage (positive Z)
  tailZ: number;     // rear edge (negative Z)
  wingtipX: number;  // half wingspan (positive X)
  topY: number;      // top of canopy (positive Y)
  centerY: number;   // vertical center (often != 0 if model origin off-axis)
};

export const MaverichJet = forwardRef<THREE.Group, Props>(function MaverichJet(
  { glowIntensityRef },
  ref
) {
  const { scene } = useGLTF("/models/fa18.glb");

  const burnerLeft = useRef<THREE.MeshStandardMaterial>(null);
  const burnerRight = useRef<THREE.MeshStandardMaterial>(null);
  const burnerLightLeft = useRef<THREE.PointLight>(null);
  const burnerLightRight = useRef<THREE.PointLight>(null);

  // Clone the cached scene so this jet instance owns its own matrix
  // and material refs — useGLTF returns a shared scene that mutates
  // would otherwise cross-contaminate.
  const cloned = useMemo(() => scene.clone(true), [scene]);

  // Compute the bounding box AFTER applying the orientation rotation,
  // so nose/tail/wingtip readings are in the corrected coordinate
  // frame. This is the source of truth for where to place every
  // brand decoration (M, afterburners, sparkles).
  const metrics: ModelMetrics = useMemo(() => {
    // Apply the rotation to a transient group, measure, then drop the
    // group — the rotation is also applied to the rendered <group>
    // below, so the world transform agrees with our measurements.
    const probe = new THREE.Group();
    probe.rotation.set(MODEL_ROTATION[0], MODEL_ROTATION[1], MODEL_ROTATION[2]);
    probe.add(cloned.clone(true));
    probe.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(probe);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Longest dimension = fuselage length. Aircraft proportions: length
    // is always > wingspan for fighter jets, so this heuristic is safe
    // for the F-18 (length ≈ 17m, span ≈ 13m).
    const longestAxis = Math.max(size.x, size.y, size.z);
    const scale = TARGET_LENGTH / Math.max(longestAxis, 0.001);

    // Re-measure in the scaled frame. Do this by scaling the size
    // vector directly — same outcome as re-applying scale + recompute
    // box, but avoids a second clone.
    const scaledSize = size.clone().multiplyScalar(scale);
    const scaledCenter = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);

    return {
      scale,
      noseZ: scaledCenter.z + scaledSize.z / 2,
      tailZ: scaledCenter.z - scaledSize.z / 2,
      wingtipX: scaledSize.x / 2,
      topY: scaledCenter.y + scaledSize.y / 2,
      centerY: scaledCenter.y,
    };
  }, [cloned]);

  // Augment the loaded materials so they respond well to our HDRI
  // sunset environment. The source model's bundled materials may be
  // flat-shaded or use plain PBR with low envMap intensity — pumping
  // envMapIntensity makes the sunset light wrap the airframe with
  // visible warm/cool gradients, the single biggest visual lift.
  useEffect(() => {
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as
        | THREE.MeshStandardMaterial
        | THREE.MeshStandardMaterial[]
        | undefined;
      if (!mat) return;
      const apply = (m: THREE.MeshStandardMaterial) => {
        m.envMapIntensity = 1.6;
        // Slight metalness lift if the source had it dialed all the way
        // down — fighter-jet skin reads as semi-glossy painted metal.
        if (typeof m.metalness === "number" && m.metalness < 0.2) {
          m.metalness = 0.35;
        }
        if (typeof m.roughness === "number" && m.roughness > 0.85) {
          m.roughness = 0.55;
        }
        m.needsUpdate = true;
      };
      if (Array.isArray(mat)) mat.forEach(apply);
      else apply(mat);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    });
  }, [cloned]);

  // Per-frame: pulse + ramp the afterburner emissive intensity from
  // the parent's glowIntensityRef. Shared with the procedural jet's
  // prior behavior so the intro/scroll keyframes still hit their
  // glow targets correctly.
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

  // Decoration positions, derived from the measured bounding box so
  // they sit on the model regardless of which GLB ends up loaded.
  // Burners sit a touch behind the tail to read as exhaust trails.
  const burnerOffset = 0.15;
  const leftBurnerX = -0.18;
  const rightBurnerX = 0.18;
  const burnerY = metrics.centerY * 0.6;
  const burnerZ = metrics.tailZ - burnerOffset;

  // M call-sign placeholder: the procedural M worked because the
  // procedural fuselage was a flat box; on the real GLB a flat text
  // mesh would clip into the curved fuselage surface unless we
  // decal-project it (non-trivial, deferred to a later phase). The
  // brand mark reads on the page chrome (header, footer, loading M)
  // so the absence here doesn't lose the call-sign beat.

  return (
    <group ref={ref}>
      {/* The loaded F-18 model. Rotation maps the source's nose axis
          to the scene's +Z forward convention. Scale normalises to
          TARGET_LENGTH so the camera framing in persistent-scene
          stays accurate regardless of the source model's units. */}
      <group
        rotation={MODEL_ROTATION}
        scale={[metrics.scale, metrics.scale, metrics.scale]}
      >
        <primitive object={cloned} />
      </group>

      {/* Twin afterburner glow plates. Emissive plane discs that
          catch the bloom post-effect — read as hot exhaust without
          needing volumetric shaders. */}
      <mesh position={[leftBurnerX, burnerY, burnerZ]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[0.13, 24]} />
        <meshStandardMaterial
          ref={burnerLeft}
          color="#1A0A05"
          emissive="#FFB347"
          emissiveIntensity={2.5}
          roughness={0.7}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[rightBurnerX, burnerY, burnerZ]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[0.13, 24]} />
        <meshStandardMaterial
          ref={burnerRight}
          color="#1A0A05"
          emissive="#FFB347"
          emissiveIntensity={2.5}
          roughness={0.7}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Hot-glow halos behind the burners — point lights for soft
          bloom + scene illumination on nearby surfaces. */}
      <pointLight
        ref={burnerLightLeft}
        position={[leftBurnerX, burnerY, burnerZ - 0.4]}
        color="#FFB347"
        intensity={1.2}
        distance={6}
      />
      <pointLight
        ref={burnerLightRight}
        position={[rightBurnerX, burnerY, burnerZ - 0.4]}
        color="#FFB347"
        intensity={1.2}
        distance={6}
      />

      {/* Wingtip vapor vortices — Sparkles emitting from each
          measured wing tip. Active during the pass-over; they fade
          naturally as the camera leaves the close-up. */}
      <Sparkles
        position={[-metrics.wingtipX, burnerY, 0]}
        count={28}
        scale={[0.5, 0.3, 1.6]}
        size={2.0}
        speed={0.4}
        color="#FFE4B5"
        opacity={0.65}
      />
      <Sparkles
        position={[metrics.wingtipX, burnerY, 0]}
        count={28}
        scale={[0.5, 0.3, 1.6]}
        size={2.0}
        speed={0.4}
        color="#FFE4B5"
        opacity={0.65}
      />

    </group>
  );
});
