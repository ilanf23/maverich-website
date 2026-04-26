"use client";

import { useFrame } from "@react-three/fiber";
import { useGLTF, Text, Sparkles } from "@react-three/drei";
import { useEffect, useMemo, useRef, forwardRef } from "react";
import * as THREE from "three";

/**
 * MaverichJet — real F-18 GLB, Phase 4.2.14e diagnostic + rotation/scale fix.
 *
 * The previous iteration shipped with `rotation.y = -π/2`, which left the
 * jet side-on (fuselage along screen ±X). The symptom reverse-engineers
 * the model's native orientation: post-rotation fuselage at ±X means
 * native fuselage is along ±Z, NOT ±X. So the right answer is one of
 * `JET_ROTATION_Y ∈ {0, π}` (whichever points the nose toward camera) —
 * `±π/2` cannot ever be correct. Trying 0 first; if the jet shows tail-
 * first (away from camera) flip this constant to `Math.PI`.
 *
 * Auto-fit now scales by the SECOND-longest bbox axis. For an F/A-18 the
 * fuselage (17.1 m) is longer than the wingspan (12.3 m) which is longer
 * than the vertical extent, so `sorted[1]` ends up being wingspan and
 * the jet renders ~40 % bigger than the previous "longest = 4" rule
 * (fuselage ≈ 5.6 units, wingspan = 4 units). If you swap to a model
 * whose wingspan exceeds its length (rare for fighter jets, common for
 * gliders) `sorted[1]` automatically picks the fuselage instead, so this
 * heuristic remains stable across model swaps.
 *
 * Console diagnostics fire once on mount: native bbox, post-rotation bbox,
 * sorted axes, applied scale, and per-material texture-channel presence.
 * Read them in DevTools to verify rotation/scale before iterating.
 */

useGLTF.preload("/models/maverich-jet.glb");

// ITERATION KNOB — try `0`, `Math.PI`, then `±Math.PI / 2` only as last
// resorts. Symptom analysis says ±π/2 cannot be correct for this model;
// it's listed for completeness but skip it on first re-test.
const JET_ROTATION_Y = 0;

// Target length of the second-longest bbox axis after auto-fit. For an
// F-18 this normalises wingspan to 4 units and the fuselage drops out at
// ~5.6 units, which matches the camera framing the keyframe table was
// originally tuned for.
const TARGET_FUSELAGE_AXIS = 4.0;

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
    // ── Native orientation probe ─────────────────────────────────────
    // Run BEFORE applying rotation so the log reflects the model's
    // baked-in axes.
    const nativeBox = new THREE.Box3().setFromObject(cloned);
    const nativeSize = nativeBox.getSize(new THREE.Vector3());
    const nativeCenter = nativeBox.getCenter(new THREE.Vector3());
    const longestNativeAxis =
      nativeSize.x >= nativeSize.y && nativeSize.x >= nativeSize.z
        ? "X (suggests nose along X — try rotation.y = ±π/2)"
        : nativeSize.y >= nativeSize.z
        ? "Y (vertical orientation, unusual)"
        : "Z (suggests nose along Z — try rotation.y = 0 or π)";
    console.log("[MaverichJet] native bbox size:", nativeSize);
    console.log("[MaverichJet] native bbox center:", nativeCenter);
    console.log("[MaverichJet] longest native axis:", longestNativeAxis);

    // ── Apply rotation alignment ─────────────────────────────────────
    cloned.rotation.set(0, JET_ROTATION_Y, 0);
    cloned.updateMatrixWorld(true);

    // ── Post-rotation auto-fit ───────────────────────────────────────
    const bbox = new THREE.Box3().setFromObject(cloned);
    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());

    const sorted = [size.x, size.y, size.z].sort((a, b) => b - a);
    const fuselageAxis = sorted[1] || 0.001;
    const s = TARGET_FUSELAGE_AXIS / fuselageAxis;
    cloned.scale.setScalar(s);

    // Re-center: matrix order is T*R*S, so post-scale geometry mean is at
    // s*center in cloned's parent frame; offset position by -s*center to
    // bring the mean back to origin. (Subtracting `center` directly only
    // works when s == 1.)
    cloned.position.set(-center.x * s, -center.y * s, -center.z * s);

    console.log("[MaverichJet] post-rotation bbox size:", size);
    console.log("[MaverichJet] sorted axes (desc):", sorted);
    console.log(
      "[MaverichJet] applied scale:",
      s,
      "→ jet renders at",
      sorted.map((v) => +(v * s).toFixed(2)),
      "(longest, fuselage-axis target, shortest)"
    );

    // ── Material tuning + diagnostics ────────────────────────────────
    cloned.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof THREE.MeshStandardMaterial
      ) {
        const mat = child.material as THREE.MeshStandardMaterial;
        const name = (mat.name || "").toUpperCase();

        console.log(
          "[MaverichJet] material:",
          mat.name,
          "{ map:",
          !!mat.map,
          "normalMap:",
          !!mat.normalMap,
          "metalnessMap:",
          !!mat.metalnessMap,
          "roughnessMap:",
          !!mat.roughnessMap,
          "aoMap:",
          !!mat.aoMap,
          "envMapIntensity:",
          mat.envMapIntensity,
          "}"
        );

        if (name === "F18_GLASS") {
          // Cockpit canopy — smoked, highly reflective, faint amber
          // emissive so the bloom pass picks up a sun-glint moment.
          mat.color = new THREE.Color("#0F1A2A");
          mat.metalness = 0.9;
          mat.roughness = 0.06;
          mat.emissive = new THREE.Color("#FFA855");
          mat.emissiveIntensity = 0.18;
          mat.transparent = true;
          mat.opacity = 0.82;
          mat.envMapIntensity = 2.2;
        } else {
          // F18 airframe — already PBR-textured. Bump envMapIntensity so
          // the HDRI sunset wraps the metal panels.
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
          the rear of the fuselage. Fuselage axis spans roughly z=-2.78
          to z=+2.78 after the new fuselage-axis scale (5.56 / 2). Burner
          cones sit just behind the tail; if they appear inside the
          fuselage or detached, retune z and the ±0.35 spread. */}
      <mesh position={[-0.35, 0, -2.9]} rotation={[Math.PI / 2, 0, 0]}>
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
      <mesh position={[0.35, 0, -2.9]} rotation={[Math.PI / 2, 0, 0]}>
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
        position={[-0.35, 0, -3.3]}
        color="#FFB347"
        intensity={1.2}
        distance={6}
      />
      <pointLight
        ref={burnerLightRight}
        position={[0.35, 0, -3.3]}
        color="#FFB347"
        intensity={1.2}
        distance={6}
      />

      {/* M call-sign — front of the fuselage, just above the nose. The
          loaded model's nose sits near z=+2.78 after the fuselage-axis
          fit; the text floats at z=2.85 to read against the airframe
          without z-fighting. Outline color is brand amber so bloom
          catches it. */}
      <Text
        position={[0, 0.05, 2.85]}
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

      {/* Wingtip vapor vortices — wingspan after the new scale is the
          target axis (4 units), so wingtips ≈ ±2. Sparkles drift just
          outboard at ±2.05 so the trail reads as cleanly outside. */}
      <Sparkles
        position={[-2.05, -0.05, -0.4]}
        count={36}
        scale={[0.6, 0.3, 1.6]}
        size={2.4}
        speed={0.4}
        color="#FFE4B5"
        opacity={0.7}
      />
      <Sparkles
        position={[2.05, -0.05, -0.4]}
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
