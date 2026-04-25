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
 * Section 1 — Hero. The R3F jet flies toward the camera through a 1.5x
 * viewport pinned scroll. HTML headline overlays in front of the canvas.
 *
 * Three render paths:
 *   1. Reduced-motion: static SVG fallback, headline still animates in.
 *   2. Mobile (<768px): same static SVG fallback for v1 — Phase 9 polishes.
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

        <HeroOverlay />
      </section>
    );
  }

  return (
    <section id="hero" className="relative">
      <ScrollScene height={1.5}>
        {(progress) => (
          <>
            {/* Canvas fills the pinned viewport behind the overlay. */}
            <div className="absolute inset-0 z-0">
              <HeroScene progress={progress} />
            </div>

            {/* HTML overlay — kept clear of vertical center so the cockpit
                canopy reads cleanly through the negative space. */}
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-between px-6 py-24">
              <HeroOverlayContent progress={progress} />
            </div>
          </>
        )}
      </ScrollScene>
    </section>
  );
}

/**
 * HeroOverlay — variant used by the static fallback path. Identical content,
 * static layout (no scroll progress driving anything).
 */
function HeroOverlay() {
  return (
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
 * HeroOverlayContent — variant used inside the live scroll scene. Content
 * fades against scroll progress so the headline gets out of the cockpit's
 * way as the jet approaches the camera.
 */
function HeroOverlayContent({ progress }: { progress: number }) {
  // Headline fades 0.0 → 0.55. CTA fades in 0.55 → 1.0.
  const headlineOpacity = clamp01(1 - progress / 0.55);
  const ctaOpacity = clamp01((progress - 0.55) / 0.35);
  const headlineLift = -progress * 60; // pulls headline up as jet looms

  return (
    <>
      {/* Top: call-sign mono tag — fades only at the very end. */}
      <div
        className="pointer-events-auto pt-12"
        style={{ opacity: clamp01(1 - (progress - 0.7) / 0.3) }}
      >
        <Reveal>
          <MonoTag tone="amber">
            CALL SIGN: MAVERICH \\ BUILT BY HAND, SHIPPED ON FRIDAY
          </MonoTag>
        </Reveal>
      </div>

      {/* Headline group — anchored to upper third to clear the canopy. */}
      <div
        className="pointer-events-auto flex flex-col items-center text-center"
        style={{
          opacity: headlineOpacity,
          transform: `translateY(${headlineLift}px)`,
          willChange: "transform, opacity",
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

      {/* Bottom: CTA reveals as the jet looms */}
      <div
        className="pointer-events-auto pb-16"
        style={{
          opacity: ctaOpacity,
          transform: `translateY(${(1 - ctaOpacity) * 30}px)`,
          willChange: "transform, opacity",
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
