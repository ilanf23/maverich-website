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
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CanvasProvider } from "./canvas-provider";
import { MaverichJet } from "./maverich-jet";
import { MountainLandscape } from "./mountain-landscape";
import { TreeForest } from "./tree-forest";
import { SkyAtmosphere } from "./sky-atmosphere";
import { useIntro } from "../providers/intro-provider";

/**
 * PersistentScene — page-wide 3D world for Phase 4 v2.
 *
 * The canvas is mounted ONCE at the layout level and stays alive across
 * the entire scrollable page. Two animation regimes drive it:
 *
 *   1. INTRO regime (phase ∈ {loading, playing}):
 *      Camera + jet animated by IntroProvider.progressRef (0→1 over
 *      ~11s). Same waypoints as v1's scroll-driven hero.
 *
 *   2. PERSISTENT regime (phase === "complete"):
 *      Camera holds at a neutral cinematic pose. Jet world position is
 *      driven by page scroll progress through getJetStateForScroll().
 *      Mouse parallax adds a subtle bank/pitch toward cursor on
 *      hover-capable devices. Canyon environment fades out as the user
 *      scrolls past the hero — sections 2-6 use HTML backgrounds and
 *      the canvas falls back to alpha-clear underneath the jet.
 *
 * Continuity between regimes: the lerp factors (0.10-0.14) ensure the
 * handoff at intro completion reads as a smooth settle, not a cut.
 */

// ─── Intro keyframe table ─────────────────────────────────────────────
//
// The jet's local +Z is its forward (nose) axis, so for the camera to
// see the FRONT of the jet the camera must always be at a greater Z
// than the jet. Old v1 ended with a heroic pass-OVER (jet flew behind
// the camera, camera looked back at the jet's tail) — that stranded
// the user looking at the engines for the entire persistent regime.
//
// v2.1 keyframes preserve the dramatic canyon approach but END with
// the jet decelerating and hovering IN FRONT of the camera, nose
// toward the viewer. The final intro pose matches the persistent
// regime's neutral camera + section-1 jet pose exactly, so there's
// zero handoff jitter when phase flips to "complete".

const KEYS = [0.0, 0.2, 0.4, 0.6, 0.75, 0.9, 1.0] as const;

const INTRO_CAMERA_POS: ReadonlyArray<[number, number, number]> = [
  [0, 5, 25],     // 0.00  far establishing shot
  [0, 4.6, 22],   // 0.20  dolly start
  [0, 4.2, 18],   // 0.40  dolly mid — camera closing in
  [0, 4.0, 14],   // 0.60  approach continues
  [0, 3.8, 11],   // 0.75  near settle
  [0, 3.6, 9],    // 0.90  almost at neutral
  [0, 3.5, 8],    // 1.00  matches NEUTRAL_CAMERA_POS exactly
];

const INTRO_LOOKAT: ReadonlyArray<[number, number, number]> = [
  [0, 4, -150],   // 0.00  looking deep at far jet
  [0, 4, -100],   // 0.20  jet still small in distance
  [0, 3.5, -55],  // 0.40  jet mid-canyon
  [0, 3.5, -22],  // 0.60  jet large in frame
  [0, 3.5, -5],   // 0.75  jet emerging into close range
  [0, 3.2, 1],    // 0.90  decelerating, jet ahead of camera
  [0, 3, 0],      // 1.00  matches NEUTRAL_CAMERA_LOOKAT exactly
];

// Jet world position over the intro. Always at z < camera.z so the
// camera sees the nose throughout. Late frames decelerate sharply so
// the jet "settles" in front of the camera instead of zooming past.
const INTRO_JET_POS: ReadonlyArray<[number, number, number]> = [
  [0, 4, -150],   // 0.00  tiny dot deep in the valley
  [0, 4, -100],   // 0.20  approach
  [0, 3.7, -55],  // 0.40  mid-canyon
  [0, 3.7, -22],  // 0.60  emerging
  [0, 3.8, -5],   // 0.75  close, large in frame
  [0, 4, 2],      // 0.90  decelerating, in front of camera (cam @ z=9)
  [0, 4, 4],      // 1.00  hover — matches SECTION_POSES[0] exactly
];

// Glow peaks during the heroic mid-approach (afterburners hot) and
// settles to ambient as the jet decelerates into hover. Continuity
// with SECTION_POSES[0].glow at p=1.
const INTRO_GLOW: readonly number[] = [
  1.5, 1.8, 2.4, 3.2, 3.8, 3.0, 2.6,
];

// ─── Post-intro neutral camera pose ───────────────────────────────────
//
// After the intro completes the camera holds here. Steady eye-level
// frame, slightly back and up. The jet flies in front; its world
// position controls where it appears on screen.
//
// MUST match the last entry of INTRO_CAMERA_POS / INTRO_LOOKAT for a
// seamless intro→persistent handoff.

const NEUTRAL_CAMERA_POS = new THREE.Vector3(0, 3.5, 8);
const NEUTRAL_CAMERA_LOOKAT = new THREE.Vector3(0, 3, 0);

// ─── Sampling helpers ──────────────────────────────────────────────────

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

// ─── Per-section jet pose ──────────────────────────────────────────────
//
// Maps page scroll progress (0 → 1 across the entire scrollable page)
// to a target jet pose. Phase 4 v2 stubs reasonable behaviors per
// section; phases 5-8 refine.
//
// Section windows assume 6 equal sections + footer = ~7 viewports of
// scroll. The exact section boundaries depend on each section's actual
// rendered height — we soft-blend between key poses so any drift
// in section heights still reads as continuous motion.

type JetPose = {
  position: [number, number, number];
  rotation: [number, number, number];
  glow: number;
  scale: number;
};

const SECTION_KEYS = [0.0, 0.08, 0.22, 0.4, 0.55, 0.72, 0.88, 1.0] as const;

// Eight key poses across the page. Index 0 is the post-intro "settle"
// — its position MUST equal the intro's final jet pose for a seamless
// handoff. Every pose keeps z < camera.z (8) so the camera always sees
// the jet's NOSE, never its tail. Rotation values stay below ±π/3 so
// the jet only banks/pitches; it never rotates around to face away.
const SECTION_POSES: readonly JetPose[] = [
  // 0.00 — intro just completed. Position + glow match INTRO_*[6] so
  //        the handoff is a no-op, no jump.
  { position: [0, 4, 4], rotation: [0, 0, 0], glow: 2.6, scale: 1.4 },
  // 0.08 — Section 1 (hero settled). Wingman drifts top-right of frame.
  { position: [3, 4.5, 2], rotation: [0, -0.18, 0.06], glow: 2.4, scale: 1.4 },
  // 0.22 — Section 2 (products). Right-side formation pose, gentle bank
  //        toward the right; nose still toward camera.
  { position: [4.5, 3.8, 0], rotation: [-0.04, -0.28, 0.08], glow: 2.4, scale: 1.4 },
  // 0.40 — Section 3 (proof). Low-altitude track across the left side.
  { position: [-5, 2.5, -2], rotation: [0.03, 0.32, -0.10], glow: 2.8, scale: 1.4 },
  // 0.55 — Section 4 (process). Afterburner — engines glow brighter.
  //        Slight pitch-up + small yaw so we still see the nose AND
  //        the burner halo wraps the silhouette. Brief: AFTERBURNER MODE.
  { position: [0, 4.2, -3], rotation: [-0.14, -0.18, 0.04], glow: 4.6, scale: 1.4 },
  // 0.72 — Section 5 (founders). Calm hover on the left, banking back
  //        toward camera. RTB vibe.
  { position: [-3, 4.8, 0], rotation: [0, 0.22, -0.05], glow: 2.2, scale: 1.4 },
  // 0.88 — Section 6 (CTA). Centered, inviting. Wingman seat reads.
  { position: [0, 4, 1], rotation: [0, 0, 0], glow: 2.8, scale: 1.4 },
  // 1.00 — Footer. Jet drifts up and slightly off — "RTB".
  { position: [2, 5.5, 2], rotation: [0, -0.12, 0.03], glow: 2.0, scale: 1.4 },
];

function getJetStateForScroll(p: number): JetPose {
  const clamped = Math.min(Math.max(p, 0), 1);
  for (let i = 1; i < SECTION_KEYS.length; i++) {
    if (clamped <= SECTION_KEYS[i]) {
      const local =
        (clamped - SECTION_KEYS[i - 1]) /
        (SECTION_KEYS[i] - SECTION_KEYS[i - 1]);
      const eased = local * local * (3 - 2 * local); // smoothstep
      const a = SECTION_POSES[i - 1];
      const b = SECTION_POSES[i];
      return {
        position: [
          THREE.MathUtils.lerp(a.position[0], b.position[0], eased),
          THREE.MathUtils.lerp(a.position[1], b.position[1], eased),
          THREE.MathUtils.lerp(a.position[2], b.position[2], eased),
        ],
        rotation: [
          THREE.MathUtils.lerp(a.rotation[0], b.rotation[0], eased),
          THREE.MathUtils.lerp(a.rotation[1], b.rotation[1], eased),
          THREE.MathUtils.lerp(a.rotation[2], b.rotation[2], eased),
        ],
        glow: THREE.MathUtils.lerp(a.glow, b.glow, eased),
        scale: THREE.MathUtils.lerp(a.scale, b.scale, eased),
      };
    }
  }
  const last = SECTION_POSES[SECTION_POSES.length - 1];
  return last;
}

// ─── Animator — owns per-frame updates for camera + jet + glow ─────────

function SceneAnimator({
  jetRef,
  glowRef,
  canyonOpacityRef,
  mousePosRef,
  parallaxEnabledRef,
}: {
  jetRef: React.RefObject<THREE.Group | null>;
  glowRef: React.MutableRefObject<number>;
  canyonOpacityRef: React.MutableRefObject<number>;
  mousePosRef: React.MutableRefObject<{ x: number; y: number }>;
  parallaxEnabledRef: React.MutableRefObject<boolean>;
}) {
  const { camera } = useThree();
  const { phase, progressRef } = useIntro();

  // Reusable scratch vectors — avoid per-frame allocation.
  const targetCamPos = useMemo(() => new THREE.Vector3(0, 5, 25), []);
  const targetLookAt = useMemo(() => new THREE.Vector3(0, 4, -150), []);
  const smoothLookAt = useMemo(() => new THREE.Vector3(0, 4, -150), []);
  const targetJetPos = useMemo(() => new THREE.Vector3(0, 4, -150), []);
  const targetJetRot = useMemo(() => new THREE.Euler(0, 0, 0), []);

  // Scroll progress is read inline from window.scrollY each frame.
  // useFrame already ticks at vsync so this is cheap; doing it inside
  // the loop avoids a React state ↔ canvas round-trip.
  const scrollRef = useRef(0);
  useEffect(() => {
    const updateScroll = () => {
      const max = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      scrollRef.current = Math.min(Math.max(window.scrollY / max, 0), 1);
    };
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    return () => {
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, []);

  useFrame(() => {
    const introActive = phase !== "complete";

    if (introActive) {
      // INTRO regime — time-driven via progressRef.
      const p = progressRef.current;

      sampleVec3(INTRO_CAMERA_POS, p, targetCamPos);
      sampleVec3(INTRO_LOOKAT, p, targetLookAt);
      sampleVec3(INTRO_JET_POS, p, targetJetPos);

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
        jetRef.current.rotation.x = THREE.MathUtils.lerp(
          jetRef.current.rotation.x,
          0,
          0.1
        );
        jetRef.current.rotation.y = THREE.MathUtils.lerp(
          jetRef.current.rotation.y,
          0,
          0.1
        );
      }

      glowRef.current = sampleScalar(INTRO_GLOW, p);
      canyonOpacityRef.current = 1; // canyon fully visible during intro
    } else {
      // PERSISTENT regime — scroll + mouse drive the jet; canyon fades.
      const scroll = scrollRef.current;

      // Camera settles at the neutral pose.
      camera.position.lerp(NEUTRAL_CAMERA_POS, 0.06);
      smoothLookAt.lerp(NEUTRAL_CAMERA_LOOKAT, 0.06);
      camera.lookAt(smoothLookAt);

      // Jet pose from scroll. Apply mouse parallax on top.
      const pose = getJetStateForScroll(scroll);
      targetJetPos.set(pose.position[0], pose.position[1], pose.position[2]);
      targetJetRot.set(pose.rotation[0], pose.rotation[1], pose.rotation[2]);

      if (jetRef.current) {
        jetRef.current.position.lerp(targetJetPos, 0.08);

        const baseRollZ = pose.rotation[2];
        const basePitchX = pose.rotation[0];
        const baseYawY = pose.rotation[1];

        let mouseRoll = 0;
        let mousePitch = 0;
        if (parallaxEnabledRef.current) {
          mouseRoll = mousePosRef.current.x * 0.12;
          mousePitch = mousePosRef.current.y * 0.06;
        }

        jetRef.current.rotation.z = THREE.MathUtils.lerp(
          jetRef.current.rotation.z,
          baseRollZ + mouseRoll,
          0.08
        );
        jetRef.current.rotation.x = THREE.MathUtils.lerp(
          jetRef.current.rotation.x,
          basePitchX + mousePitch,
          0.08
        );
        jetRef.current.rotation.y = THREE.MathUtils.lerp(
          jetRef.current.rotation.y,
          baseYawY,
          0.08
        );

        const cur = jetRef.current.scale.x;
        const next = THREE.MathUtils.lerp(cur, pose.scale, 0.1);
        jetRef.current.scale.set(next, next, next);
      }

      glowRef.current = pose.glow;

      // Canyon environment fade — fully visible at hero (scroll < 0.06),
      // fully gone past the products section. Sections 2-6 then read
      // against their own HTML backgrounds with the jet drifting over.
      const targetCanyonOpacity = 1 - smoothstep(0.04, 0.18, scroll);
      canyonOpacityRef.current = THREE.MathUtils.lerp(
        canyonOpacityRef.current,
        targetCanyonOpacity,
        0.08
      );
    }
  });

  return null;
}

// ─── EffectController — bloom intensity + canyon environment opacity ──

function EffectController({
  bloomRef,
  canyonGroupRef,
  canyonOpacityRef,
  godRaysRef,
  fogRef,
}: {
  bloomRef: React.MutableRefObject<{ intensity?: number } | null>;
  canyonGroupRef: React.RefObject<THREE.Group | null>;
  canyonOpacityRef: React.MutableRefObject<number>;
  godRaysRef: React.MutableRefObject<{
    weight?: number;
    exposure?: number;
  } | null>;
  fogRef: React.RefObject<THREE.Fog | null>;
}) {
  const { phase, progressRef } = useIntro();

  useFrame(() => {
    const p = phase === "complete" ? 1 : progressRef.current;
    // Bloom: 1.0 → 1.7 over the burner ramp window.
    const bloomIntensity = 1.0 + smoothstep(0.45, 0.85, p) * 0.7;
    const bloom = bloomRef.current;
    if (bloom && typeof bloom.intensity === "number") {
      bloom.intensity = bloomIntensity;
    }

    // Canyon environment fade. Mountains/sky/trees live under canyonGroup;
    // we hide the whole group when opacity collapses to keep the per-mesh
    // material fade work off the hot path.
    const opacity = canyonOpacityRef.current;
    const group = canyonGroupRef.current;
    if (group) {
      group.visible = opacity > 0.01;
    }

    // Fog range collapses as we leave the canyon — past the hero the
    // scene is just the jet, no warm haze background.
    const fog = fogRef.current;
    if (fog) {
      fog.far = THREE.MathUtils.lerp(60, 240, opacity);
    }

    // GodRays — diminish with the canyon. Past the hero the sun's gone.
    const gr = godRaysRef.current;
    if (gr) {
      if (typeof gr.weight === "number") gr.weight = 0.45 * opacity;
      if (typeof gr.exposure === "number") gr.exposure = 0.6 * opacity;
    }
  });
  return null;
}

// ─── Mouse parallax tracking ───────────────────────────────────────────

function useMouseParallax(): {
  mousePosRef: React.MutableRefObject<{ x: number; y: number }>;
  enabledRef: React.MutableRefObject<boolean>;
} {
  const mousePosRef = useRef({ x: 0, y: 0 });
  const enabledRef = useRef(false);
  const { phase } = useIntro();

  useEffect(() => {
    const hoverCapable =
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover)").matches;
    enabledRef.current = hoverCapable && phase === "complete";
  }, [phase]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mousePosRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -((e.clientY / window.innerHeight) * 2 - 1),
      };
    };
    window.addEventListener("mousemove", handler, { passive: true });
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return { mousePosRef, enabledRef };
}

// ─── PersistentScene — the page-wide world ─────────────────────────────

export function PersistentScene() {
  const jetRef = useRef<THREE.Group>(null);
  const glowRef = useRef(1.5);
  const canyonGroupRef = useRef<THREE.Group>(null);
  const canyonOpacityRef = useRef(1);
  const bloomRef = useRef<{ intensity?: number } | null>(null);
  const godRaysRef = useRef<{ weight?: number; exposure?: number } | null>(null);
  const fogRef = useRef<THREE.Fog | null>(null);

  const [sunMesh, setSunMesh] = useState<THREE.Mesh | null>(null);
  const { mousePosRef, enabledRef: parallaxEnabledRef } = useMouseParallax();

  return (
    <CanvasProvider frameloop="always" className="absolute inset-0">
      <PerspectiveCamera
        makeDefault
        position={[0, 5, 25]}
        fov={50}
        near={0.1}
        far={500}
      />

      {/* Warm sunset fog — range animates with canyon opacity in
          EffectController so distant peaks don't pop when canyon hides.
          ref drives mutation; we never reach into useThree().scene.fog
          for the same animation, which would be a hook-immutability
          violation. */}
      <fog ref={fogRef} attach="fog" args={["#8B3B1F", 35, 240]} />

      {/* HDRI sunset environment — global IBL. background={false} keeps
          our shader sky as the visible sky; env only contributes lighting
          and reflections. environmentIntensity holds steady; the canyon
          fade handles the visual transition. */}
      <Environment preset="sunset" background={false} environmentIntensity={0.7} />

      {/* Faint warm fill so shadow valleys never go fully black. */}
      <ambientLight intensity={0.1} color="#5C2820" />

      {/* Key sun light — low angle, warm color, behind the camera-facing
          scene direction. Sunset backlighting in one directional. */}
      <directionalLight
        position={[-30, 8, -20]}
        intensity={2.5}
        color="#FF7B3C"
      />

      {/* Canyon environment — sky + mountains + trees. Wrapped in a
          group whose opacity/visibility tracks scroll past the hero. */}
      <group ref={canyonGroupRef} name="canyon-environment">
        <SkyAtmosphere sunRef={setSunMesh} />
        <MountainLandscape />
        <TreeForest count={200} />
      </group>

      {/* The jet — driven by SceneAnimator. Lives outside the canyon
          group so it survives the post-hero fade. */}
      <group ref={jetRef} position={[0, 4, -150]} scale={0.6}>
        <MaverichJet glowIntensityRef={glowRef} />
      </group>

      {/* Per-frame animator — switches between intro + persistent regimes
          based on phase. */}
      <SceneAnimator
        jetRef={jetRef}
        glowRef={glowRef}
        canyonOpacityRef={canyonOpacityRef}
        mousePosRef={mousePosRef}
        parallaxEnabledRef={parallaxEnabledRef}
      />

      {/* Post-processing — single composer for the whole page. Only
          mounts after the sun mesh is known so GodRays gets a valid
          emitter on first frame. */}
      {sunMesh && (
        <EffectComposer>
          <GodRays
            ref={(r: unknown) => {
              godRaysRef.current = (r as { weight?: number; exposure?: number } | null) ?? null;
            }}
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
          <Bloom
            ref={(r: unknown) => {
              bloomRef.current = (r as { intensity?: number } | null) ?? null;
            }}
            intensity={1.0}
            luminanceThreshold={0.55}
            luminanceSmoothing={0.4}
            mipmapBlur
          />
          <DepthOfField
            focusDistance={0.04}
            focalLength={0.05}
            bokehScale={3}
          />
          <Vignette eskil={false} offset={0.12} darkness={0.7} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}

      <EffectController
        bloomRef={bloomRef}
        canyonGroupRef={canyonGroupRef}
        canyonOpacityRef={canyonOpacityRef}
        godRaysRef={godRaysRef}
        fogRef={fogRef}
      />
    </CanvasProvider>
  );
}

export default PersistentScene;
