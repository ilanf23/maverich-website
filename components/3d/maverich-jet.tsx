"use client";

import { useFrame } from "@react-three/fiber";
import { useGLTF, Text, Sparkles } from "@react-three/drei";
import { useEffect, useMemo, useRef, forwardRef } from "react";
import * as THREE from "three";

/**
 * MaverichJet — real F-18 GLB, Phase 4.2.14d realism upgrade.
 *
 * Replaces the 78 KB Poly-by-Google placeholder with an ~8 MB CGTrader
 * F-18 (Royalty-Free Standard, commercial use OK), Draco-compressed,
 * full PBR (BaseColor + Normal + MetallicRoughness + Occlusion). Two
 * materials: `F18` (airframe) and `F18_Glass` (canopy, alpha BLEND).
 *
 * Two model-specific frame conventions need to be reconciled with the
 * scene's keyframe table (which assumes nose at local +Z, fuselage
 * span ~4 units along Z):
 *
 *   1. The CGTrader F-18 ships with nose along local +X. We rotate the
 *      cloned scene by -90° around Y so its forward axis becomes +Z.
 *      This rotation is applied BEFORE the bbox probe so the auto-fit
 *      math sees the rotated extents.
 *
 *   2. Auto-fit uses the LONGEST bbox axis (not just Z) to compute
 *      scale, so a wrong rotation guess can't produce a tiny or giant
 *      jet — it just renders sideways, which is visually obvious.
 *
 * Material tuning is keyed off material name. Body gets a slight
 * envMapIntensity bump so the HDRI sunset reflects on the airframe;
 * canopy gets smoked + faint amber emissive for the bloom pass to grab.
 */

useGLTF.preload("/models/maverich-jet.glb");

// Target longest-axis length in local units. Matches the procedural
// jet's extent so the existing camera + scroll choreography frames
// the jet identically to v1/v2.
const TARGET_LENGTH = 4.0;

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

  useEffect(() => {
    // Align CGTrader F-18 (nose at +X by default) to scene convention
    // (nose at +Z). Apply rotation BEFORE the bbox probe so auto-fit
    // and centering operate on the rotated extents.
    cloned.rotation.set(0, -Math.PI / 2, 0);
    cloned.updateMatrixWorld(true);

    const bbox = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const longest = Math.max(size.x, size.y, size.z, 0.001);
    const s = TARGET_LENGTH / longest;
    cloned.scale.setScalar(s);

    // Re-center so the model's bbox midpoint sits at the parent group's
    // origin. center is in pre-scale world coords; multiply by s to
    // convert to the post-scale offset that needs to be subtracted.
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    cloned.position.set(-center.x * s, -center.y * s, -center.z * s);

    cloned.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof THREE.MeshStandardMaterial
      ) {
        const mat = child.material as THREE.MeshStandardMaterial;
        const name = (mat.name || "").toUpperCase();

        if (name === "F18_GLASS") {
          // Cockpit canopy — smoked, highly reflective, faint amber
          // emissive so the bloom pass picks up a sun-glint moment
          // during the heroic pass.
          mat.color = new THREE.Color("#0F1A2A");
          mat.metalness = 0.9;
          mat.roughness = 0.06;
          mat.emissive = new THREE.Color("#FFA855");
          mat.emissiveIntensity = 0.18;
          mat.transparent = true;
          mat.opacity = 0.82;
          mat.envMapIntensity = 2.2;
        } else {
          // F18 airframe — already PBR-textured. We just bump
          // envMapIntensity so the HDRI sunset wraps the metal panels,
          // and ensure shadows are on.
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
          the rear of the fuselage. Coords are in the post-scale local
          frame: longest axis spans z=-2 to z=+2 after auto-fit, so the
          burner cones sit just behind the tail at z=-2.1. The F-18's
          twin engine spread (~0.3 unit at scale 4/17.1m) puts the
          burners at x=±0.35. */}
      <mesh position={[-0.35, 0, -2.1]} rotation={[Math.PI / 2, 0, 0]}>
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
      <mesh position={[0.35, 0, -2.1]} rotation={[Math.PI / 2, 0, 0]}>
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
        position={[-0.35, 0, -2.5]}
        color="#FFB347"
        intensity={1.2}
        distance={6}
      />
      <pointLight
        ref={burnerLightRight}
        position={[0.35, 0, -2.5]}
        color="#FFB347"
        intensity={1.2}
        distance={6}
      />

      {/* M call-sign — front of the fuselage, just above the nose. The
          loaded model's nose sits near z=+2 after auto-fit; the text
          floats at z=2.05 to read against the airframe without
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

      {/* Wingtip vapor vortices — amber-tinted Sparkles approximating
          the F/A-18 wingspan-to-length ratio (12.3m / 17.1m ≈ 0.72) at
          our normalized length 4 → wingspan ~2.88, so wingtips ≈ ±1.44.
          We drift slightly outboard to ±1.5 so the vortex trails read
          as cleanly outside the wingtip. */}
      <Sparkles
        position={[-1.5, -0.05, -0.4]}
        count={36}
        scale={[0.6, 0.3, 1.6]}
        size={2.4}
        speed={0.4}
        color="#FFE4B5"
        opacity={0.7}
      />
      <Sparkles
        position={[1.5, -0.05, -0.4]}
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
