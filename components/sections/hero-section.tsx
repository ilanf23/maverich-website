"use client";

import { motion } from "motion/react";
import { MonoTag, Reveal } from "@/components/motion";
import { useIntro } from "@/components/providers/intro-provider";
import { usePrefersReducedMotion } from "@/components/hooks/use-prefers-reduced-motion";

const REVEAL_EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Section 1 — Hero. Phase 4 v2: pure HTML overlay above the persistent
 * canvas.
 *
 * The 3D world (canyon + jet) is mounted page-wide in
 * PersistentCanvasMount, so this section only renders the textual
 * overlay. UI is hidden during the cinematic intro and fades in with
 * stagger after IntroProvider reports phase === "complete":
 *
 *    Top mono tag (delay 0.3s) → headline (0.6s) → subhead (0.9s)
 *      → CTA (1.2s)
 *
 * Fallback paths:
 *   • Reduced-motion: PersistentCanvasMount renders nothing (handled
 *     there). Hero shows the static SVG fallback instantly with all UI
 *     visible. No scroll lock. No intro.
 *   • Default desktop + mobile: time-driven cinematic, then UI reveal.
 */
export function HeroSection() {
  const reduced = usePrefersReducedMotion();
  const { phase } = useIntro();

  if (reduced) {
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

  // The cinematic UI fades in once the intro hits "complete". On
  // returning visits IntroProvider short-circuits past playing, so the
  // reveal happens essentially on first paint after the loader.
  const reveal = phase === "complete";

  return (
    <section
      id="hero"
      className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden"
    >
      {/* Cinematic overlay — only fades in after the intro completes.
          pointer-events:none on the wrapper so the canvas underneath
          can still receive any events in the future; individual
          interactive elements opt back in. */}
      <div className="pointer-events-none absolute inset-0">
        <HeroOverlayCinematic reveal={reveal} />
      </div>
    </section>
  );
}

/**
 * HeroOverlayStatic — reduced-motion fallback. Same content beats as
 * the cinematic, no animation gating.
 */
function HeroOverlayStatic() {
  return (
    <div className="relative z-10 flex flex-col items-center">
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

/**
 * HeroOverlayCinematic — staggered fade-in once `reveal` flips true.
 * Initial state: everything hidden + slightly offset. Reveal: each
 * group settles in over ~0.8s, ramped against the brief's
 * 0.3 / 0.6 / 0.9 / 1.2 delay schedule.
 */
function HeroOverlayCinematic({ reveal }: { reveal: boolean }) {
  return (
    <>
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
