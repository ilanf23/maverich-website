"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { MonoTag, Reveal } from "@/components/motion";
import { useIntro } from "@/components/providers/intro-provider";

// Dynamic-import the 3D scene with ssr: false so three/drei never enter
// the server bundle. Suspense fallback is null — the canvas paints over
// the deep background.
const HeroScene = dynamic(
  () => import("@/components/3d/hero-scene").then((m) => m.HeroScene),
  { ssr: false, loading: () => null }
);

const REVEAL_EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Section 1 — Hero. Phase 4 v2: auto-playing cinematic intro.
 *
 * On page load (desktop, motion-allowed) the canyon-approach + heroic
 * pass-over plays automatically over ~11 seconds. Scroll is locked
 * page-wide during that window (handled in IntroProvider). Once the
 * intro completes, scroll unlocks and the hero text + header fade in
 * with stagger.
 *
 * Fallback paths:
 *   1. Reduced-motion: static SVG fallback, all UI shown immediately.
 *   2. Mobile (<768px): static SVG fallback, all UI shown immediately.
 *   3. Default: time-driven canvas + cinematic UI fade-in.
 */
export function HeroSection() {
  const reduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { progressRef, phase, skip, active } = useIntro();

  useEffect(() => {
    setMounted(true);
    const mql = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  const useStaticFallback = reduced || isMobile || !mounted;

  if (useStaticFallback) {
    return (
      <section
        id="hero"
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-24"
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: "url(/hero-fallback.svg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        <HeroOverlayStatic />
      </section>
    );
  }

  // The cinematic UI fades in once the intro hits "complete". On returning
  // visits the hook short-circuits to complete, so the reveal happens
  // within the first frame.
  const reveal = phase === "complete";

  return (
    <section
      id="hero"
      className="relative h-screen w-full overflow-hidden"
    >
      {/* 3D canvas — fills the section. Driven by time-based progress
          (read inside useFrame from the shared ref — no per-frame React
          re-render). */}
      <div className="absolute inset-0 z-0">
        <HeroScene progressRef={progressRef} />
      </div>

      {/* Cinematic HTML overlay — only fades in after the intro completes. */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <HeroOverlayCinematic reveal={reveal} />
      </div>

      {/* Skip control — bottom-right, only while the intro is playing.
          Fades in shortly after the intro starts so it doesn't compete
          with the establishing frame. */}
      {active && phase === "playing" && <SkipIntroButton onSkip={skip} />}
    </section>
  );
}

function SkipIntroButton({ onSkip }: { onSkip: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onSkip}
      className="type-mono-tag fixed bottom-6 right-6 z-50 rounded-full px-4 py-2"
      style={{
        color: "var(--ink-secondary)",
        border: "1px solid var(--border-subtle)",
        background: "var(--surface-glass)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        pointerEvents: "auto",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.55 }}
      whileHover={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: REVEAL_EASE, delay: 1.2 }}
      aria-label="Skip cinematic intro"
    >
      SKIP INTRO →
    </motion.button>
  );
}

/**
 * HeroOverlayCinematic — staggered fade-in once `reveal` flips true.
 * Initial state: everything hidden + slightly offset. Reveal: each group
 * settles in over ~0.8s, ramped against the brief's 0.3 / 0.6 / 0.9 / 1.2
 * delay schedule.
 */
function HeroOverlayCinematic({ reveal }: { reveal: boolean }) {
  return (
    <>
      {/* Top: call-sign mono tag */}
      <motion.div
        className="absolute left-0 right-0 top-0 flex justify-center pt-12"
        initial={{ opacity: 0, y: -16 }}
        animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: -16 }}
        transition={{ duration: 0.8, ease: REVEAL_EASE, delay: reveal ? 0.3 : 0 }}
        style={{ pointerEvents: reveal ? "auto" : "none" }}
      >
        <MonoTag tone="amber">CALL SIGN: MAVERICH \\ V1.0</MonoTag>
      </motion.div>

      {/* Center: headline + subhead */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <motion.h1
          className="type-display-1 max-w-[18ch]"
          initial={{ opacity: 0, y: 30 }}
          animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.9, ease: REVEAL_EASE, delay: reveal ? 0.6 : 0 }}
        >
          Vibe-coded
          <br />
          <span style={{ color: "var(--accent-amber)" }}>
            operating systems.
          </span>
        </motion.h1>

        <motion.p
          className="type-body-lg mt-8 max-w-2xl"
          style={{ color: "var(--ink-secondary)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: REVEAL_EASE, delay: reveal ? 0.9 : 0 }}
        >
          We build the software that runs the businesses that don&apos;t have
          time to build software.
        </motion.p>
      </div>

      {/* Bottom: CTA */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 flex justify-center pb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8, ease: REVEAL_EASE, delay: reveal ? 1.2 : 0 }}
        style={{ pointerEvents: reveal ? "auto" : "none" }}
      >
        <a
          href="#products"
          className="type-mono-tag inline-flex items-center gap-3 rounded-full px-5 py-3 transition-colors hover:bg-white/5"
          style={{
            color: "var(--accent-amber)",
            border: "1px solid var(--border-subtle)",
            background: "var(--surface-glass)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          TAKE THE WINGMAN SEAT →
        </a>
      </motion.div>
    </>
  );
}

/**
 * HeroOverlayStatic — fallback path. Mobile and reduced-motion users
 * land here directly with all content visible — no intro to wait through.
 */
function HeroOverlayStatic() {
  return (
    <div className="relative z-10 flex flex-col items-center">
      <Reveal>
        <MonoTag tone="amber" className="mb-12 block">
          CALL SIGN: MAVERICH \\ V1.0
        </MonoTag>
      </Reveal>

      <Reveal delay={0.15}>
        <h1 className="type-display-1 max-w-[18ch] text-center">
          Vibe-coded
          <br />
          <span style={{ color: "var(--accent-amber)" }}>
            operating systems.
          </span>
        </h1>
      </Reveal>

      <Reveal delay={0.3}>
        <p
          className="type-body-lg mt-10 max-w-2xl text-center"
          style={{ color: "var(--ink-secondary)" }}
        >
          We build the software that runs the businesses that don&apos;t have
          time to build software.
        </p>
      </Reveal>

      <Reveal delay={0.45}>
        <p
          className="type-display-3 mt-12 text-center"
          style={{ color: "var(--accent-amber)" }}
        >
          Built by hand. Shipped on Friday.
        </p>
      </Reveal>

      <Reveal delay={0.6}>
        <a
          href="#products"
          className="type-mono-tag mt-16 inline-flex items-center gap-2 rounded-full px-5 py-3 transition-colors hover:bg-white/5"
          style={{
            color: "var(--accent-amber)",
            border: "1px solid var(--border-subtle)",
            background: "var(--surface-glass)",
          }}
        >
          TAKE THE WINGMAN SEAT →
        </a>
      </Reveal>
    </div>
  );
}
