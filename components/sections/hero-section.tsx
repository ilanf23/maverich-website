"use client";

import { motion, useReducedMotion } from "motion/react";
import { MonoTag, Reveal } from "@/components/motion";

/**
 * Section 1 — Hero. Placeholder atmospheric only. The R3F jet scene drops in
 * during Phase 4 and will replace the gradient fills below.
 */
export function HeroSection() {
  const reduced = useReducedMotion();

  return (
    <section
      id="hero"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-24"
    >
      {/* Warm sunrise haze — placeholder atmospheric */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{
          height: "60vh",
          background:
            "radial-gradient(ellipse at 50% 0%, var(--warm-haze-bright) 0%, var(--warm-haze) 30%, transparent 70%)",
          opacity: 0.5,
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0"
        style={{
          width: "40vw",
          height: "40vh",
          background:
            "radial-gradient(ellipse at 0% 100%, var(--cool-haze-bright) 0%, transparent 70%)",
          opacity: 0.4,
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0"
        style={{
          width: "40vw",
          height: "40vh",
          background:
            "radial-gradient(ellipse at 100% 100%, var(--cool-haze-bright) 0%, transparent 70%)",
          opacity: 0.4,
        }}
      />

      {/* Hero content */}
      <div className="relative z-10 flex flex-col items-center">
        <Reveal>
          <MonoTag tone="amber" className="mb-12 block">
            CALL SIGN: MAVERICH \\ BUILT BY HAND, SHIPPED ON FRIDAY
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
          <div
            className="mt-20 inline-flex items-center gap-2 rounded-full px-4 py-2"
            style={{
              background: "var(--surface-glass)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--accent-amber)" }}
            />
            <MonoTag tone="muted" bracket={false}>
              v0.1 — site under construction
            </MonoTag>
          </div>
        </Reveal>
      </div>

      {/* Scroll hint — subtle bouncing mono at the bottom of the viewport */}
      <motion.a
        href="#products"
        className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-2"
        aria-label="Scroll to continue"
        initial={reduced ? false : { opacity: 0 }}
        animate={reduced ? undefined : { opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
      >
        <MonoTag tone="subtle">SCROLL TO CONTINUE</MonoTag>
        <motion.span
          aria-hidden
          style={{ color: "var(--ink-muted)", fontSize: "0.75rem" }}
          animate={reduced ? undefined : { y: [0, 6, 0] }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          ↓
        </motion.span>
      </motion.a>
    </section>
  );
}
