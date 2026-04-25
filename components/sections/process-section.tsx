"use client";

import { MonoTag, ScrollScene } from "@/components/motion";

const BEATS = [
  { at: 0.0, label: "Idea Monday." },
  { at: 0.35, label: "Live Friday." },
  { at: 0.7, label: "Iterating Saturday." },
];

/**
 * Section 4 — How We Work / Full Afterburner. ScrollScene pins the section
 * for 1.5 viewport heights and uses scroll progress to drive three kinetic
 * headline beats. Phase 7 will add the prism sonic-boom moment on the word
 * "vibe-coded" and afterburner flames behind the 3D jet.
 */
export function ProcessSection() {
  return (
    <section id="process" className="relative">
      <ScrollScene height={1.8}>
        {(progress) => {
          const active = BEATS.reduce(
            (acc, beat, i) => (progress >= beat.at ? i : acc),
            0
          );

          return (
            <div className="relative flex h-full w-full flex-col items-center justify-center px-6">
              {/* Amber glow — intensifies with scroll to mimic afterburner */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 100%, var(--warm-haze-bright) 0%, transparent 60%)",
                  opacity: 0.2 + progress * 0.5,
                }}
              />

              <div className="relative z-10 flex flex-col items-center">
                <MonoTag tone="muted" className="mb-10 block">
                  SECTION 04 \\ FULL AFTERBURNER
                </MonoTag>

                {BEATS.map((beat, i) => {
                  const isActive = active === i;
                  return (
                    <div
                      key={beat.label}
                      className="type-display-2 text-center transition-all"
                      style={{
                        color: isActive
                          ? "var(--ink-primary)"
                          : "var(--ink-muted)",
                        opacity: isActive ? 1 : 0.25,
                        transform: isActive ? "scale(1)" : "scale(0.9)",
                        transitionDuration: "var(--dur-base)",
                        transitionTimingFunction: "var(--ease-out-expo)",
                      }}
                    >
                      {beat.label}
                    </div>
                  );
                })}

                <div className="mt-16">
                  <MonoTag tone="amber">
                    PROGRESS: {String(Math.round(progress * 100)).padStart(3, " ")}%
                  </MonoTag>
                </div>
              </div>
            </div>
          );
        }}
      </ScrollScene>
    </section>
  );
}
