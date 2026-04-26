"use client";

import { Reveal } from "@/components/motion";

type Surface = {
  name: string;
  tagline: string;
};

const SURFACES: Surface[] = [
  {
    name: "Maverich.OS",
    tagline: "The Command Deck for operators.",
  },
  {
    name: "Vertical OS",
    tagline: "Operating systems for one operator at a time. CLX as the example.",
  },
  {
    name: "Advisor.tv",
    tagline: "The proof point for the broader ecosystem.",
  },
];

export function ProductsSection() {
  return (
    <section
      id="products"
      className="relative flex min-h-screen flex-col justify-center px-6 py-32"
    >
      <div className="mx-auto w-full max-w-6xl">
        <Reveal delay={0.1}>
          <h2 className="type-display-2 max-w-[18ch]">
            Three surfaces.{" "}
            <span style={{ color: "var(--accent-amber)" }}>One formation.</span>
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p
            className="type-body-lg mt-8 max-w-2xl"
            style={{ color: "var(--ink-secondary)" }}
          >
            Maverich is three products, built by hand. Each surface solves a
            different layer of the operator&apos;s workflow.
          </p>
        </Reveal>

        <div className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-3">
          {SURFACES.map((surface, i) => (
            <Reveal key={surface.name} delay={0.3 + i * 0.1}>
              <article
                className="flex h-full flex-col justify-between rounded-lg p-8"
                style={{
                  background: "var(--surface-glass)",
                  border: "1px solid var(--border-subtle)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div>
                  <h3 className="type-display-3">{surface.name}</h3>
                  <p
                    className="type-body mt-4"
                    style={{ color: "var(--ink-secondary)" }}
                  >
                    {surface.tagline}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
