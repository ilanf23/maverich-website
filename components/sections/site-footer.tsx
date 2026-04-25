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

        <nav className="flex items-center gap-8">
          <a href="#proof" className="type-mono-tag" style={{ color: "var(--ink-secondary)" }}>
            Work
          </a>
          <a href="#process" className="type-mono-tag" style={{ color: "var(--ink-secondary)" }}>
            Process
          </a>
          <a href="#cta" className="type-mono-tag" style={{ color: "var(--ink-secondary)" }}>
            Contact
          </a>
        </nav>

        <MonoTag tone="subtle">v1.0 — SHIPPED APRIL 2026</MonoTag>
      </div>

      <div className="mx-auto mt-10 w-full max-w-6xl text-center">
        <MonoTag tone="subtle">© 2026 MAVERICH.AI — BUILT BY HUMANS.</MonoTag>
      </div>

      {/* CC-BY-SA-4.0 attribution for the F/A-18 Hornet 3D model — required
          by the model's license. Kept small + muted so it doesn't compete
          with the brand chrome. */}
      <div
        className="mx-auto mt-3 w-full max-w-6xl text-center"
        style={{ color: "var(--ink-muted)", fontSize: "0.65rem", lineHeight: 1.5 }}
      >
        F/A-18 Hornet model based on{" "}
        <a
          href="https://sketchfab.com/3d-models/low-poly-fa-18-hornet-9b48c88e91ba40fc8f518b616f44f714"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          &ldquo;Low Poly F/A-18 Hornet&rdquo;
        </a>{" "}
        by{" "}
        <a
          href="https://sketchfab.com/cs09736"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          cs09736
        </a>{" "}
        — licensed under{" "}
        <a
          href="http://creativecommons.org/licenses/by-sa/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          CC-BY-SA-4.0
        </a>
        .
      </div>
    </footer>
  );
}
