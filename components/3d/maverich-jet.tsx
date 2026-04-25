"use client";

import { useFrame } from "@react-three/fiber";
import { useGLTF, Text, Sparkles } from "@react-three/drei";
import { useEffect, useMemo, useRef, forwardRef } from "react";
import * as THREE from "three";

/**
 * MaverichJet — real GLB model, Phase 4.2.14b realism hotfix.
 *
 * The procedural box-and-cone fuselage from v1/v2 has been replaced by a
 * compact CC-BY 3.0 jet GLB ("Jet" by Poly by Google, ~78 KB, 4 separated
 * materials: body / canopy / engines / wings). Attribution lives in
 * `public/models/CREDITS.md` and is required by the license.
 *
 * The loaded model has its nose at local +Z and an unscaled fuselage
 * length of ~10 units along Z. We apply a scale that normalises the
 * fuselage to ~4 units along Z so the rest of the scene's camera framing
 * and the parent group's scroll-driven scale (0.6 → 1.4) keep working
 * without changes. All overlay positions (afterburners, M call-sign,
 * wingtip sparkles) are then in the same local frame the procedural jet
 * used, so persistent-scene.tsx's keyframe table is untouched.
 *
 * Material augmentation: the loaded scene is traversed once on mount;
 * MeshStandardMaterials get a metalness bump + envMapIntensity boost so
 * the HDRI sunset env (set up in persistent-scene.tsx) actually catches
 * a reflection on the airframe. Without this the loaded model reads as
 * flat-shaded plastic under the post-process pipeline.
 */

useGLTF.preload("/models/maverich-jet.glb");

// Target fuselage length in local units. Matches the procedural jet's
// extent so the existing camera + scroll choreography keeps framing the
// jet identically.
const TARGET_LENGTH_Z = 4.0;

type Props = {
  glowIntensityRef?: React.MutableRefObject<number>;
};

export const MaverichJet = forwardRef<THREE.Group, Props>(function MaverichJet(
  { glowIntensityRef },
  ref
) {
  const { scene } = useGLTF("/models/maverich-jet.glb");

  // Clone so HMR + multiple instances don't share state, and so our
  // material mutations don't bleed into Drei's internal cache.
  const cloned = useMemo(() => scene.clone(true), [scene]);

  // One-time bounding-box probe + auto-scale + material tuning.
  useEffect(() => {
    const bbox = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const lengthZ = Math.max(size.z, 0.001);
    const s = TARGET_LENGTH_Z / lengthZ;
    cloned.scale.setScalar(s);

    // Re-center along Z so the fuselage midpoint sits at z=0 in the
    // parent group's local frame (matches the procedural jet's centring).
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    cloned.position.set(-center.x * s, -center.y * s, -center.z * s);

    cloned.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof THREE.MeshStandardMaterial
      ) {
        const mat = child.material as THREE.MeshStandardMaterial;
        // Material names in this GLB are hex colour codes — use them to
        // route per-part tuning without depending on mesh hierarchy.
        const name = (mat.name || "").toUpperCase();

        if (name === "80DEEA") {
          // Cockpit canopy — smoked glass with a faint amber emissive so
          // the bloom pass picks up the sun-glint moment.
          mat.color = new THREE.Color("#0F1A2A");
          mat.metalness = 0.85;
          mat.roughness = 0.08;
          mat.emissive = new THREE.Color("#FFA855");
          mat.emissiveIntensity = 0.22;
          mat.transparent = true;
          mat.opacity = 0.86;
          mat.envMapIntensity = 2.0;
        } else if (name === "1A1A1A") {
          // Engines / dark vents — keep dark, low metalness so they read
          // as holes in the silhouette under the HDRI.
          mat.metalness = 0.1;
          mat.roughness = 0.85;
          mat.envMapIntensity = 0.3;
        } else if (name === "78909C") {
          // Wing/light-grey panels — bias toward brushed metal so the
          // sun catches a bright leading-edge rim during the heroic pass.
          mat.metalness = 0.7;
          mat.roughness = 0.38;
          mat.envMapIntensity = 1.6;
        } else {
          // Default body — armoured metal.
          mat.metalness = 0.65;
          mat.roughness = 0.42;
          mat.envMapIntensity = 1.4;
        }
        mat.needsUpdate = true;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [cloned]);

  const burnerLeft = useRef<THREE.MeshStandardMaterial>(null);
  const burnerRight = useRef<THREE.MeshStandardMaterial>(null);
  const burnerLightLeft = useRef<THREE.PointLight>(null);
  const burnerLightRight = useRef<THREE.PointLight>(null);

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
      <primitive object={cloned} />

      {/* Twin afterburners — emissive cylinders + halo point lights at
          the rear of the fuselage. Positions are in the post-scale local
          frame: fuselage spans z=-2 to z=+2, so engines sit at z=-2.1. */}
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

      {/* M call-sign — front of the fuselage, just above the nose. The
          loaded model's nose sits at ~z=2.0 after scaling; the text
          floats at z=2.05 so it reads against the airframe without
          z-fighting. Outline color is brand amber so bloom catches it. */}
      <Text
        position={[0, 0.05, 2.05]}
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

      {/* Wingtip vapor vortices — amber-tinted Sparkles at the loaded
          model's measured wingtip extent (x ≈ ±1.3 after scale 0.4 on
          a model whose wings span ±3.23 native). */}
      <Sparkles
        position={[-1.3, -0.05, -0.4]}
        count={36}
        scale={[0.6, 0.3, 1.6]}
        size={2.4}
        speed={0.4}
        color="#FFE4B5"
        opacity={0.7}
      />
      <Sparkles
        position={[1.3, -0.05, -0.4]}
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
