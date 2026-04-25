"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Environment, PerspectiveCamera } from "@react-three/drei";
import {
  Bloom,
  DepthOfField,
  EffectComposer,
  GodRays,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction, KernelSize, ToneMappingMode } from "postprocessing";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CanvasProvider } from "./canvas-provider";
import { MaverichJet } from "./maverich-jet";
import { MountainLandscape } from "./mountain-landscape";
import { TreeForest } from "./tree-forest";
import { SkyAtmosphere } from "./sky-atmosphere";

/**
 * Phase 4 v2 keyframe table — same waypoints as v1, now driven by an
 * 11-second time progress instead of scroll progress.
 *
 *   Progress | Camera        | LookAt / Jet      | Glow | Notes
 *   0.00     | (0, 5, 25)    | (0, 4, -150)      | 1.5  | Tiny dot deep in valley
 *   0.20     | (0, 4, 20)    | (0, 4, -120)      | 1.8  | Approach
 *   0.40     | (0, 3, 15)    | (0, 3, -80)       | 2.2  | Mid-valley
 *   0.60     | (0, 2.5, 10)  | (0, 2.5, -30)     | 2.8  | Emerging from canyon
 *   0.75     | (0, 2, 5)     | (0, 2, -10)       | 3.5  | Close pass
 *   0.90     | (0, 1.5, 2)   | (0, 1.5, -3)      | 4.2  | Almost overhead
 *   1.00     | (0, 1, 0)     | (0, 5, 5)         | 4.5  | Above and beyond
 *
 * Camera lookAt also rotates from (0,4,-150) ahead-and-down to (0,5,5)
 * up-and-behind by p=1.0 — that's the "camera follows the jet over and
 * out" beat.
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

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

function HeroAnimator({
  progressRef,
  jetRef,
  glowRef,
}: {
  progressRef: React.MutableRefObject<number>;
  jetRef: React.RefObject<THREE.Group | null>;
  glowRef: React.MutableRefObject<number>;
}) {
  const { camera } = useThree();

  const targetCamPos = useMemo(() => new THREE.Vector3(0, 5, 25), []);
  const targetLookAt = useMemo(() => new THREE.Vector3(0, 4, -150), []);
  const smoothLookAt = useMemo(() => new THREE.Vector3(0, 4, -150), []);
  const targetJetPos = useMemo(() => new THREE.Vector3(0, 4, -150), []);

  useFrame(() => {
    const p = progressRef.current;

    sampleVec3(CAMERA_POS, p, targetCamPos);
    sampleVec3(LOOKAT, p, targetLookAt);
    sampleVec3(JET_POS, p, targetJetPos);

    // Camera position smoothing — 0.12 reads as a confident dolly, not a
    // hard cut. Slightly stiffer than v1's 0.08 because the timeline now
    // dictates pace and we want to honor it.
    camera.position.lerp(targetCamPos, 0.12);

    smoothLookAt.lerp(targetLookAt, 0.12);
    camera.lookAt(smoothLookAt);

    if (jetRef.current) {
      jetRef.current.position.lerp(targetJetPos, 0.14);
      const targetScale = 0.6 + 0.8 * Math.min(Math.max(p, 0), 1);
      const cur = jetRef.current.scale.x;
      const next = THREE.MathUtils.lerp(cur, targetScale, 0.14);
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

    glowRef.current = sampleScalar(GLOW, p);
  });

  return null;
}

/**
 * EffectController — animates post-process parameters over the intro
 * timeline. Currently drives bloom intensity, which the BloomEffect
 * class exposes as a plain getter/setter — safe to write each frame.
 *
 * DoF param animation is left off in v2: postprocessing's
 * DepthOfFieldEffect exposes its focusDistance via internal uniforms
 * that aren't part of the public API, and reaching into them risks
 * breaking on minor version bumps. Holding DoF at the constant brief
 * value (focusDistance=0.04) reads as "soft far mountains, sharp
 * jet" throughout — which is the cinematic frame we want.
 */
function EffectController({
  progressRef,
  bloomRef,
}: {
  progressRef: React.MutableRefObject<number>;
  bloomRef: React.MutableRefObject<{ intensity?: number } | null>;
}) {
  useFrame(() => {
    const p = progressRef.current;
    // Bloom: 1.0 → 1.7 over the burner ramp window.
    const bloomIntensity = 1.0 + smoothstep(0.45, 0.85, p) * 0.7;
    const bloom = bloomRef.current;
    if (bloom && typeof bloom.intensity === "number") {
      bloom.intensity = bloomIntensity;
    }
  });
  return null;
}

/**
 * HeroScene — sunset canyon + jet, autonomously animated by the parent
 * via `progress` prop (0→1 over ~11s).
 *
 * Composition order (back → front):
 *   1. Environment (HDRI sunset preset) — global lighting + reflections
 *   2. SkyAtmosphere — sky dome, sun mesh, valley haze, stars
 *   3. Supplemental warm directional — long shadow direction
 *   4. MountainLandscape — 4 layers of receding ridges/peaks
 *   5. TreeForest — instanced trees on foreground ridges
 *   6. MaverichJet — driven by HeroAnimator
 *   7. EffectComposer — bloom, DoF, vignette, ACES tonemap, godrays
 */
export function HeroScene({
  progressRef,
}: {
  progressRef: React.MutableRefObject<number>;
}) {
  const jetRef = useRef<THREE.Group>(null);
  const glowRef = useRef(1.5);

  // Sun mesh state — set when SkyAtmosphere mounts. Used to wire GodRays
  // to a real Object3D, which the postprocessing effect needs to compute
  // ray screen-position each frame.
  const [sunMesh, setSunMesh] = useState<THREE.Mesh | null>(null);

  // Ref for live-tuning bloom intensity from EffectController.
  const bloomRef = useRef<{ intensity?: number } | null>(null);

  return (
    <CanvasProvider frameloop="always" className="absolute inset-0">
      <PerspectiveCamera
        makeDefault
        position={[0, 5, 25]}
        fov={50}
        near={0.1}
        far={500}
      />

      {/* Warmer fog for sunset — distant peaks fade into deep orange-brown,
          not amber-haze. Range slightly extended so horizon range still
          reads at z=-300. */}
      <fog attach="fog" args={["#8B3B1F", 35, 240]} />

      {/* HDRI sunset environment — global IBL. The "sunset" preset comes
          with @react-three/drei via Poly Haven CDN; baked into bundle on
          first load. background={false} keeps our painted sky dome as the
          actual visible sky; the env only contributes lighting/reflections. */}
      <Environment preset="sunset" background={false} environmentIntensity={0.7} />

      {/* Sky dome + sun + haze. Sun ref lifts up to GodRays below. */}
      <SkyAtmosphere sunRef={setSunMesh} />

      {/* Faint warm fill — ambient light keeps shadow valleys from going
          fully black. Lower intensity than v1 because Environment now
          delivers the bulk of the diffuse contribution. */}
      <ambientLight intensity={0.1} color="#5C2820" />

      {/* The key sun light — low angle (y=8), warm color, BEHIND the
          camera-facing scene direction so mountain peaks rim-light and
          slopes go into deep shadow. Sunset backlighting in one
          directional. */}
      <directionalLight
        position={[-30, 8, -20]}
        intensity={2.5}
        color="#FF7B3C"
      />

      {/* Static landscape — mountains + trees stay fixed in world space. */}
      <MountainLandscape />
      <TreeForest count={200} />

      {/* The brand character — driven by HeroAnimator below. */}
      <group ref={jetRef} position={[0, 4, -150]} scale={0.6}>
        <MaverichJet glowIntensityRef={glowRef} />
      </group>

      {/* Time-driven camera + jet animator. Reads progressRef each frame. */}
      <HeroAnimator
        progressRef={progressRef}
        jetRef={jetRef}
        glowRef={glowRef}
      />

      {/* Post-processing pipeline. Mounted only after the sun mesh is
          known so GodRays gets a valid emitter on first frame. */}
      {sunMesh && (
        <EffectComposer>
          {/* GodRays — volumetric shafts radiating from the sun behind
              the mountains. KernelSize.SMALL keeps the effect performant;
              samples reduced from default for the same reason. */}
          <GodRays
            sun={sunMesh}
            blendFunction={BlendFunction.SCREEN}
            samples={45}
            density={0.94}
            decay={0.92}
            weight={0.45}
            exposure={0.6}
            clampMax={1.0}
            blur
            kernelSize={KernelSize.SMALL}
          />
          {/* Bloom — afterburner glow + sun get a luminous halo. */}
          <Bloom
            ref={(r: unknown) => {
              bloomRef.current = (r as { intensity?: number } | null) ?? null;
            }}
            intensity={1.0}
            luminanceThreshold={0.55}
            luminanceSmoothing={0.4}
            mipmapBlur
          />
          {/* Depth of field — distant mountains soft-focus while jet is
              sharp during the close-up. */}
          <DepthOfField
            focusDistance={0.04}
            focalLength={0.05}
            bokehScale={3}
          />
          {/* Vignette — subtle edge darkening for cinematic framing. */}
          <Vignette eskil={false} offset={0.12} darkness={0.7} />
          {/* ACES Filmic — film-quality color response replacing R3F's
              default linear tonemap. */}
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}

      {/* Per-frame post-effect param updater — needs to mount inside the
          Canvas to access useFrame. */}
      <EffectController
        progressRef={progressRef}
        bloomRef={bloomRef}
      />
    </CanvasProvider>
  );
}

export default HeroScene;
