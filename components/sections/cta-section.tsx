"use client";

import { MonoTag, Reveal } from "@/components/motion";

/**
 * Section 6 — Take the Wingman Seat. Direct mailto CTA. Phase 10 will embed
 * Calendly below for the "want to talk first" flow.
 */
export function CtaSection() {
  return (
    <section
      id="cta"
      className="relative flex min-h-screen flex-col items-center justify-center px-6 py-32 text-center"
    >
      <div className="mx-auto w-full max-w-3xl">
        <Reveal>
          <MonoTag tone="muted" className="mb-6 block">
            SECTION 06 \\ OPEN SEAT
          </MonoTag>
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="type-display-2">
            Take the{" "}
            <span style={{ color: "var(--accent-amber)" }}>wingman seat.</span>
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p
            className="type-body-lg mx-auto mt-10 max-w-xl"
            style={{ color: "var(--ink-secondary)" }}
          >
            We take on a small number of operators each year. If you&apos;re
            running a real business and want it to run on software you actually
            love, write us.
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <a
            href="mailto:ilan@maverich.ai?subject=Wingman%20seat"
            className="mt-12 inline-flex items-center gap-3 rounded-full px-8 py-4 transition-transform duration-200"
            style={{
              background: "var(--accent-amber)",
              color: "var(--bg-deep)",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontWeight: 500,
              fontSize: "1rem",
              letterSpacing: "-0.01em",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.background = "var(--accent-amber-glow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.background = "var(--accent-amber)";
            }}
          >
            Request the seat
            <span aria-hidden>→</span>
          </a>
        </Reveal>

        <Reveal delay={0.4}>
          <div className="mt-10">
            <MonoTag tone="subtle">CALENDLY EMBED — PHASE 10</MonoTag>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
