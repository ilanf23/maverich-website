"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Stars } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { CanvasProvider } from "./canvas-provider";
import { MaverichJet } from "./maverich-jet";

/**
 * Brief §3 scroll table → numeric keyframes. Scene units, not meters.
 * The jet is ~5 units long; camera positions are tuned so wings fill ~half
 * the frame at the 50% mark and wholly fill it at 75%.
 */
const KEYFRAMES = {
  cameraZ: [35, 22, 14, 8, -3] as const,
  cameraY: [0, 0.5, 0, -0.5, -1] as const,
  lookAtY: [0, 0, 0, 0.5, 0.5] as const,
  glow: [1.5, 1.8, 2.5, 3.5, 4.5] as const,
};

/** Piecewise-linear lookup along the 5 keyframes [0, 0.25, 0.5, 0.75, 1]. */
function sample(values: readonly number[], p: number): number {
  const clamped = Math.min(Math.max(p, 0), 1);
  const segs = values.length - 1;
  const idx = Math.min(Math.floor(clamped * segs), segs - 1);
  const local = (clamped - idx / segs) * segs;
  return THREE.MathUtils.lerp(values[idx], values[idx + 1], local);
}

/**
 * HeroAnimator — runs inside the Canvas and lerps camera / jet state
 * toward the targets sampled from the current scroll progress. Uses a
 * progress ref so prop changes don't tear the animation across renders.
 */
function HeroAnimator({
  progress,
  jetRef,
  glowRef,
}: {
  progress: number;
  jetRef: React.RefObject<THREE.Group | null>;
  glowRef: React.MutableRefObject<number>;
}) {
  const { camera } = useThree();
  const progressRef = useRef(progress);
  progressRef.current = progress;

  // Reusable target vector — avoids per-frame allocation.
  const lookAt = useRef(new THREE.Vector3());

  useFrame(() => {
    const p = progressRef.current;
    const targetZ = sample(KEYFRAMES.cameraZ, p);
    const targetY = sample(KEYFRAMES.cameraY, p);
    const targetLookY = sample(KEYFRAMES.lookAtY, p);

    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.08);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.08);
    lookAt.current.set(0, targetLookY, 0);
    camera.lookAt(lookAt.current);

    // Subtle jet bank — peaks at progress 0.25, returns to level by 0.75.
    if (jetRef.current) {
      const targetRoll = Math.sin(p * Math.PI) * 0.06;
      jetRef.current.rotation.z = THREE.MathUtils.lerp(
        jetRef.current.rotation.z,
        targetRoll,
        0.06
      );
    }

    // Update the glow target the jet's afterburner pulse rides on top of.
    glowRef.current = sample(KEYFRAMES.glow, p);
  });

  return null;
}

/**
 * HeroScene — the full pinned R3F scene.
 *
 * Composition:
 *   - dark warm-tinted scene background + atmospheric fog
 *   - Stars (drei) for the sunrise altitude void
 *   - warm key light upper-left, cool rim lower-right, dim warm ambient
 *   - the procedural jet, banking subtly with scroll
 *   - a scroll-driven animator that flies the camera toward the jet
 *
 * frameloop="always" because the burner pulse + camera lerp run continuously,
 * not just on scroll.
 */
export function HeroScene({ progress = 0 }: { progress?: number }) {
  const jetRef = useRef<THREE.Group>(null);
  const glowRef = useRef(1.5);

  return (
    <CanvasProvider frameloop="always" className="absolute inset-0">
      <PerspectiveCamera makeDefault position={[0, 0, 35]} fov={45} near={0.1} far={200} />

      {/* Deep warm-tinted void with exponential fog falloff. */}
      <color attach="background" args={["#0A0A0B"]} />
      <fog attach="fog" args={["#0A0A0B", 20, 100]} />

      {/* Distant starfield for atmospheric depth. */}
      <Stars
        radius={120}
        depth={50}
        count={1500}
        factor={3}
        saturation={0}
        fade
        speed={0.3}
      />

      {/* Warm fill — sunrise haze on the horizon. */}
      <ambientLight intensity={0.18} color="#5C3920" />

      {/* Key light, upper-left — sunrise catching leading edges. */}
      <directionalLight position={[-10, 8, 5]} intensity={1.5} color="#F5C97D" />

      {/* Cool rim light, lower-right — separates the jet from the void. */}
      <directionalLight position={[8, -3, -5]} intensity={0.8} color="#6B9DFF" />

      {/* The brand character. */}
      <MaverichJet ref={jetRef} glowIntensityRef={glowRef} />

      {/* Scroll-linked camera + jet animator. */}
      <HeroAnimator progress={progress} jetRef={jetRef} glowRef={glowRef} />
    </CanvasProvider>
  );
}

export default HeroScene;
