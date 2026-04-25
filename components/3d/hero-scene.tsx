"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CanvasProvider } from "./canvas-provider";
import { MaverichJet } from "./maverich-jet";
import { MountainLandscape } from "./mountain-landscape";
import { TreeForest } from "./tree-forest";
import { SkyAtmosphere } from "./sky-atmosphere";

/**
 * Phase 4 keyframe table — Stage 1 (canyon approach) + Stage 2 (heroic pass).
 *
 *   Progress | Camera        | LookAt / Jet      | Glow | Notes
 *   0.00     | (0, 5, 25)    | (0, 4, -150)      | 1.5  | Tiny dot deep in valley
 *   0.20     | (0, 4, 20)    | (0, 4, -120)      | 1.8  | Approach
 *   0.40     | (0, 3, 15)    | (0, 3, -80)       | 2.2  | Mid-valley
 *   0.60     | (0, 2.5, 10)  | (0, 2.5, -30)     | 2.8  | Emerging from canyon ← stage transition
 *   0.75     | (0, 2, 5)     | (0, 2, -10)       | 3.5  | Close pass
 *   0.90     | (0, 1.5, 2)   | (0, 1.5, -3)      | 4.2  | Almost overhead
 *   1.00     | (0, 1, 0)     | (0, 5, 5)         | 4.5  | Above and beyond — exits frame
 *
 * Mountains and sky stay static; only the camera and jet move. The smooth
 * 0.6 transition is implicit because all values pass through it as a
 * continuous curve — there's no hard cut between stages.
 */
const KEYS = [0.0, 0.2, 0.4, 0.6, 0.75, 0.9, 1.0] as const;

const CAMERA_POS: ReadonlyArray<[number, number, number]> = [
  [0, 5, 25],
  [0, 4, 20],
  [0, 3, 15],
  [0, 2.5, 10],
  [0, 2, 5],
  [0, 1.5, 2],
  [0, 1, 0],
];

// Camera lookAt matches the jet position at every keyframe — camera tracks
// the jet through its full flight path. By 1.0, lookAt is up+forward, so
// the camera has rotated to follow the jet over and out.
const LOOKAT: ReadonlyArray<[number, number, number]> = [
  [0, 4, -150],
  [0, 4, -120],
  [0, 3, -80],
  [0, 2.5, -30],
  [0, 2, -10],
  [0, 1.5, -3],
  [0, 5, 5],
];

const JET_POS = LOOKAT;

const GLOW: readonly number[] = [1.5, 1.8, 2.2, 2.8, 3.5, 4.2, 4.5];

/**
 * Sample non-uniform keyframes by binary-searching the segment containing
 * the input progress, then linear-interpolating within that segment.
 */
function sampleScalar(values: readonly number[], p: number): number {
  const clamped = Math.min(Math.max(p, 0), 1);
  for (let i = 1; i < KEYS.length; i++) {
    if (clamped <= KEYS[i]) {
      const local = (clamped - KEYS[i - 1]) / (KEYS[i] - KEYS[i - 1]);
      return THREE.MathUtils.lerp(values[i - 1], values[i], local);
    }
  }
  return values[values.length - 1];
}

function sampleVec3(
  values: ReadonlyArray<[number, number, number]>,
  p: number,
  out: THREE.Vector3
): THREE.Vector3 {
  const clamped = Math.min(Math.max(p, 0), 1);
  for (let i = 1; i < KEYS.length; i++) {
    if (clamped <= KEYS[i]) {
      const local = (clamped - KEYS[i - 1]) / (KEYS[i] - KEYS[i - 1]);
      const a = values[i - 1];
      const b = values[i];
      out.set(
        THREE.MathUtils.lerp(a[0], b[0], local),
        THREE.MathUtils.lerp(a[1], b[1], local),
        THREE.MathUtils.lerp(a[2], b[2], local)
      );
      return out;
    }
  }
  const last = values[values.length - 1];
  out.set(last[0], last[1], last[2]);
  return out;
}

/**
 * HeroAnimator — runs inside the Canvas, lerps camera state + jet state
 * each frame toward the keyframe-sampled target. The 0.08 lerp factor
 * smooths over scrub jitter so even a fast scroll-fling reads as a
 * cinematic dolly. Both position AND lookAt are smoothed independently —
 * critical for the 0.9→1.0 lookAt flip, which would otherwise snap.
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

  // Reusable target vectors — avoid per-frame allocation.
  const targetCamPos = useMemo(() => new THREE.Vector3(0, 5, 25), []);
  const targetLookAt = useMemo(() => new THREE.Vector3(0, 4, -150), []);
  const smoothLookAt = useMemo(() => new THREE.Vector3(0, 4, -150), []);
  const targetJetPos = useMemo(() => new THREE.Vector3(0, 4, -150), []);

  useFrame(() => {
    const p = progressRef.current;

    sampleVec3(CAMERA_POS, p, targetCamPos);
    sampleVec3(LOOKAT, p, targetLookAt);
    sampleVec3(JET_POS, p, targetJetPos);

    // Smooth camera position
    camera.position.lerp(targetCamPos, 0.08);

    // Smooth lookAt — keep a separate vector that chases the keyframe lookAt
    // so camera orientation also damps on the fast 0.9→1.0 flip.
    smoothLookAt.lerp(targetLookAt, 0.08);
    camera.lookAt(smoothLookAt);

    // Drive the jet to its target position. Smooth scale: 0.6 (far) → 1.4
    // (close), linearly across the full scroll range.
    if (jetRef.current) {
      jetRef.current.position.lerp(targetJetPos, 0.1);
      const targetScale = 0.6 + 0.8 * Math.min(Math.max(p, 0), 1);
      const cur = jetRef.current.scale.x;
      const next = THREE.MathUtils.lerp(cur, targetScale, 0.1);
      jetRef.current.scale.set(next, next, next);

      // Subtle bank during the canyon approach; level for the heroic pass.
      const bankP = Math.min(p / 0.6, 1);
      const targetRoll = Math.sin(bankP * Math.PI) * 0.06;
      jetRef.current.rotation.z = THREE.MathUtils.lerp(
        jetRef.current.rotation.z,
        targetRoll,
        0.06
      );
    }

    // Burner glow — the jet's own useFrame layers a 3Hz pulse on top.
    glowRef.current = sampleScalar(GLOW, p);
  });

  return null;
}

/**
 * HeroScene — the full canyon scene + jet, pinned for 3 viewports.
 *
 * Composition order (back → front):
 *   1. SkyAtmosphere — sky dome, stars, valley haze
 *   2. Lights — warm sunrise key + cool fill ambient
 *   3. MountainLandscape — 4 layers of receding ridges/peaks
 *   4. TreeForest — instanced trees on foreground ridges
 *   5. MaverichJet — the brand character, animated by HeroAnimator
 *
 * Fog is warm (#3D2818) with range (30, 200) per the brief — distant
 * peaks fade to amber haze, not black, which is what makes sunrise read.
 */
export function HeroScene({ progress = 0 }: { progress?: number }) {
  const jetRef = useRef<THREE.Group>(null);
  const glowRef = useRef(1.5);

  return (
    <CanvasProvider frameloop="always" className="absolute inset-0">
      <PerspectiveCamera
        makeDefault
        position={[0, 5, 25]}
        fov={50}
        near={0.1}
        far={500}
      />

      {/* Warm haze fog — distant peaks fade into the sunrise sky color. */}
      <fog attach="fog" args={["#3D2818", 30, 200]} />

      {/* Sky dome + stars + volumetric valley haze. */}
      <SkyAtmosphere />

      {/* Warm fill — sunrise haze ambient. */}
      <ambientLight intensity={0.22} color="#5C3920" />

      {/* Key light, upper-left — sunrise catching leading edges. */}
      <directionalLight
        position={[-30, 20, 10]}
        intensity={1.8}
        color="#F5C97D"
      />

      {/* Cool rim light, lower-right — separates jet/peaks from the valley. */}
      <directionalLight
        position={[20, -5, -10]}
        intensity={0.6}
        color="#6B9DFF"
      />

      {/* Static landscape — mountains + trees stay fixed in world space. */}
      <MountainLandscape />
      <TreeForest count={200} />

      {/* The brand character — driven by HeroAnimator below. */}
      <group ref={jetRef} position={[0, 4, -150]} scale={0.6}>
        <MaverichJet glowIntensityRef={glowRef} />
      </group>

      {/* Scroll-linked camera + jet animator. */}
      <HeroAnimator progress={progress} jetRef={jetRef} glowRef={glowRef} />
    </CanvasProvider>
  );
}

export default HeroScene;
