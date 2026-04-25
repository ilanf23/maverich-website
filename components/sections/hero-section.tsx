"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { MonoTag, Reveal, ScrollScene } from "@/components/motion";

// Dynamic-import the 3D scene with ssr: false so three/drei never enter the
// server bundle. Suspense fallback is null — the canvas paints over the deep
// background, so a flash-of-empty looks the same as the loaded first frame.
const HeroScene = dynamic(
  () => import("@/components/3d/hero-scene").then((m) => m.HeroScene),
  { ssr: false, loading: () => null }
);

/**
 * Section 1 — Hero. Two-stage 3D scene (Phase 4):
 *
 *   Stage 1 (0 → 60%): canyon approach. Camera dollies forward through a
 *   forested mountain valley at sunrise; jet is a tiny dot deep in the
 *   valley, growing as it threads between peaks toward the camera.
 *
 *   Stage 2 (60 → 100%): heroic pass-over. Jet bursts out of the valley
 *   and transitions into the head-on close-up — wings spreading, twin
 *   afterburners blazing — until it flies directly over the camera.
 *
 * The scene pins for 3 viewports of scroll runway. HTML overlays sync to
 * scroll progress: headline 0–60%, tagline 60–90%, CTA 90–100%.
 *
 * Three render paths:
 *   1. Reduced-motion: static SVG fallback, headline still animates in.
 *   2. Mobile (<768px): static SVG fallback for v1 — Phase 9 polishes.
 *   3. Default: pinned ScrollScene drives the canvas via scroll progress.
 */
export function HeroSection() {
  const reduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mql = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  // Render the static fallback for reduced-motion users, mobile, and the
  // first server-paint (avoids hydration flash of an empty canvas slot).
  const useStaticFallback = reduced || isMobile || !mounted;

  if (useStaticFallback) {
    return (
      <section
        id="hero"
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-24"
      >
        {/* Static fallback frame — same composition cues as the live scene. */}
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

  return (
    <section id="hero" className="relative">
      <ScrollScene height={3}>
        {(progress) => (
          <>
            {/* Canvas fills the pinned viewport behind the overlay. */}
            <div className="absolute inset-0 z-0">
              <HeroScene progress={progress} />
            </div>

            {/* HTML overlay — three timed groups synced to scroll progress. */}
            <div className="pointer-events-none absolute inset-0 z-10">
              <HeroOverlayContent progress={progress} />
            </div>
          </>
        )}
      </ScrollScene>
    </section>
  );
}

/**
 * HeroOverlayStatic — fallback path. Static composition, no scroll-driven
 * animation, but the same content beats as the live scene.
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

/**
 * HeroOverlayContent — three timed groups, each scroll-linked to a window
 * of the 3-viewport runway:
 *
 *   • Headline group  → opacity ramps in over 0.0–0.10, holds, fades out 0.50–0.60
 *   • Tagline group   → fades in 0.60–0.70, fades out 0.85–0.92
 *   • CTA             → fades in 0.90–0.98
 *
 * Stacked absolutely so each group occupies the same vertical space and we
 * cross-dissolve between them rather than reflow. pointer-events: auto only
 * on the currently-visible group so links don't trap clicks invisibly.
 */
function HeroOverlayContent({ progress }: { progress: number }) {
  const headlineOpacity = clamp01(
    progress < 0.1 ? progress / 0.1 : 1 - clamp01((progress - 0.5) / 0.1)
  );
  const taglineOpacity =
    progress < 0.6
      ? 0
      : progress < 0.7
        ? (progress - 0.6) / 0.1
        : progress < 0.85
          ? 1
          : progress < 0.92
            ? 1 - (progress - 0.85) / 0.07
            : 0;
  const ctaOpacity = clamp01((progress - 0.9) / 0.08);

  // Mono call-sign tag at the very top — fades out around 0.7 with the
  // headline so the tagline gets a clean stage.
  const monoOpacity = clamp01(1 - (progress - 0.55) / 0.15);

  // Slight upward lift on each group as it fades — adds a sense of motion
  // without competing with the canvas action.
  const headlineLift = -progress * 30;
  const taglineLift = (1 - taglineOpacity) * 20;
  const ctaLift = (1 - ctaOpacity) * 24;

  return (
    <>
      {/* Top: call-sign mono tag */}
      <div
        className="pointer-events-auto absolute left-0 right-0 top-0 flex justify-center pt-12"
        style={{ opacity: monoOpacity }}
      >
        <Reveal>
          <MonoTag tone="amber">
            CALL SIGN: MAVERICH \\ V1.0
          </MonoTag>
        </Reveal>
      </div>

      {/* Center stage — three stacked groups cross-dissolving between scenes. */}
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="relative w-full max-w-4xl text-center">
          {/* Group 1 — value-prop headline (0 → 0.6) */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{
              opacity: headlineOpacity,
              transform: `translateY(${headlineLift}px)`,
              willChange: "transform, opacity",
              pointerEvents: headlineOpacity > 0.1 ? "auto" : "none",
            }}
          >
            <Reveal delay={0.15}>
              <h1 className="type-display-1 max-w-[18ch]">
                Vibe-coded
                <br />
                <span style={{ color: "var(--accent-amber)" }}>
                  operating systems.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={0.3}>
              <p
                className="type-body-lg mt-8 max-w-2xl"
                style={{ color: "var(--ink-secondary)" }}
              >
                We build the software that runs the businesses that don&apos;t
                have time to build software.
              </p>
            </Reveal>
          </div>

          {/* Group 2 — personality tagline (0.6 → 0.92) */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              opacity: taglineOpacity,
              transform: `translateY(${taglineLift}px)`,
              willChange: "transform, opacity",
              pointerEvents: taglineOpacity > 0.1 ? "auto" : "none",
            }}
          >
            <p
              className="type-display-3 max-w-[20ch]"
              style={{ color: "var(--accent-amber)" }}
            >
              Built by hand. <br />
              Shipped on Friday.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom: CTA — appears after the jet has passed overhead */}
      <div
        className="absolute bottom-0 left-0 right-0 flex justify-center pb-16"
        style={{
          opacity: ctaOpacity,
          transform: `translateY(${ctaLift}px)`,
          willChange: "transform, opacity",
          pointerEvents: ctaOpacity > 0.5 ? "auto" : "none",
        }}
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
      </div>
    </>
  );
}

function clamp01(n: number): number {
  return Math.min(Math.max(n, 0), 1);
}
