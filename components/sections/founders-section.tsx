"use client";

import { MonoTag, Reveal } from "@/components/motion";

/**
 * Section 5 — Founder Note / Return to Base. Editorial single-column layout.
 * Phase 9 will swap the avatar placeholders for real B&W photography of
 * Ilan, Adam, and Aidan.
 */
export function FoundersSection() {
  return (
    <section
      id="founders"
      className="relative flex min-h-screen flex-col justify-center px-6 py-32"
    >
      <div className="mx-auto w-full max-w-2xl">
        <Reveal>
          <MonoTag tone="muted" className="mb-6 block">
            SECTION 05 \\ RETURN TO BASE
          </MonoTag>
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="type-display-3">
            Three brothers.{" "}
            <span style={{ color: "var(--accent-amber)" }}>One runway.</span>
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <div
            className="type-body-lg mt-10 space-y-6"
            style={{ color: "var(--ink-secondary)" }}
          >
            <p>
              We started Maverich because we kept watching good operators drown
              in software that wasn&apos;t built for them. Generic SaaS. Brittle
              glue scripts. Dashboards that measured everything except the
              thing that actually moved the business.
            </p>
            <p>
              So we build the software ourselves, one operator at a time. We
              ship fast because we&apos;re small, and we stay small because we
              ship fast. Idea Monday. Live Friday. Iterating Saturday.
            </p>
            <p>
              If it feels a little cinematic, that&apos;s on purpose. The site
              is the demo. The software is the promise.
            </p>
            <p style={{ color: "var(--ink-primary)" }}>
              — Ilan, Adam, Aidan
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="mt-12">
            <MonoTag tone="amber">
              JACKSONVILLE, FL — BUILDING SINCE 2024
            </MonoTag>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
