"use client";

import { MonoTag } from "@/components/motion";

/**
 * Footer. The prism hairline is the once-per-page signature moment called
 * out in brief §7. The animated stroke-draw wordmark ships in a later phase.
 */
export function SiteFooter() {
  return (
    <footer className="relative px-6 pb-10 pt-24">
      {/* Prism gradient hairline — one of the three permitted prism moments per brief */}
      <div
        aria-hidden
        className="mx-auto mb-10 h-px w-full max-w-6xl"
        style={{
          background:
            "linear-gradient(135deg, #FF6B9D, #C77DFF, #6B9DFF, #5DEAB8)",
          opacity: 0.55,
        }}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 md:flex-row md:justify-between">
        <a
          href="#hero"
          className="font-medium"
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontSize: "1.25rem",
            color: "var(--ink-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          Maverich
        </a>

        <MonoTag tone="subtle">v1.0 — SHIPPED APRIL 2026</MonoTag>
      </div>

      <div className="mx-auto mt-10 w-full max-w-6xl text-center">
        <MonoTag tone="subtle">© 2026 MAVERICH.AI — BUILT BY HUMANS.</MonoTag>
      </div>
    </footer>
  );
}
