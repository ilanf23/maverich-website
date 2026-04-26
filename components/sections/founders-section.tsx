"use client";

import { MonoTag, Reveal } from "@/components/motion";

/**
 * Section 5 — Founder Note. Editorial single-column layout.
 */
export function FoundersSection() {
  return (
    <section
      id="founders"
      className="relative flex min-h-screen flex-col justify-center px-6 py-32"
    >
      <div className="mx-auto w-full max-w-2xl">
        <Reveal delay={0.1}>
          <h2 className="type-display-3">
            One pilot.{" "}
            <span style={{ color: "var(--accent-amber)" }}>One runway.</span>
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <div
            className="type-body-lg mt-10 space-y-6"
            style={{ color: "var(--ink-secondary)" }}
          >
            <p>
              I started Maverich because I kept watching good operators drown
              in software that wasn&apos;t built for them. Generic SaaS. Brittle
              glue scripts. Dashboards that measured everything except the
              thing that actually moved the business.
            </p>
            <p>
              So I build the software myself, one operator at a time. I ship
              fast because I&apos;m small, and I stay small because I ship
              fast. Idea Monday. Live Friday. Iterating Saturday.
            </p>
            <p>
              If it feels a little cinematic, that&apos;s on purpose. The site
              is the demo. The software is the promise.
            </p>
            <p style={{ color: "var(--ink-primary)" }}>
              — Ilan
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
