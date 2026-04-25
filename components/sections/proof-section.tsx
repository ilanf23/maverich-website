"use client";

import { MonoTag, Parallax, Reveal } from "@/components/motion";

type Tile = {
  title: string;
  caption: string;
  speed: number; // parallax rate — >1 rushes forward, <1 recedes
};

const TILES: Tile[] = [
  { title: "CLX — Dashboard", caption: "Deal pipeline + GTM metrics", speed: 1.15 },
  { title: "CLX — Deal map", caption: "Geo view of active deals", speed: 0.85 },
  { title: "CLX — Blog", caption: "Editorial surface, MDX-driven", speed: 1.1 },
  { title: "Borshchak — Hero", caption: "Editorial DTC storefront", speed: 0.9 },
];

/**
 * Section 3 — Proof Wall / Low Pass. Browser-window style tiles drift at
 * different parallax rates to mimic the "low pass over a flight line" camera
 * pattern described in the brief.
 */
export function ProofSection() {
  return (
    <section
      id="proof"
      className="relative flex min-h-screen flex-col justify-center px-6 py-32"
    >
      <div className="mx-auto w-full max-w-6xl">
        <Reveal>
          <MonoTag tone="muted" className="mb-6 block">
            SECTION 03 \\ LOW PASS
          </MonoTag>
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="type-display-2 max-w-[20ch]">
            Operating systems that are{" "}
            <span style={{ color: "var(--accent-amber)" }}>
              running money right now.
            </span>
          </h2>
        </Reveal>

        <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-2">
          {TILES.map((tile) => (
            <Parallax key={tile.title} speed={tile.speed}>
              <article
                className="group relative overflow-hidden rounded-md"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {/* Fake browser chrome */}
                <div
                  className="flex items-center gap-2 border-b px-4 py-2"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <span className="h-2 w-2 rounded-full bg-[var(--ink-muted)] opacity-40" />
                  <span className="h-2 w-2 rounded-full bg-[var(--ink-muted)] opacity-40" />
                  <span className="h-2 w-2 rounded-full bg-[var(--ink-muted)] opacity-40" />
                </div>

                {/* Placeholder shot — Phase 6 drops in real screenshots */}
                <div
                  className="flex aspect-[16/10] items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(232, 181, 71, 0.06) 0%, rgba(107, 157, 255, 0.04) 100%)",
                  }}
                >
                  <span className="type-mono-tag" style={{ color: "var(--ink-muted)" }}>
                    [ SCREENSHOT PLACEHOLDER ]
                  </span>
                </div>

                <div className="flex items-center justify-between p-5">
                  <div>
                    <h3
                      className="type-body"
                      style={{ color: "var(--ink-primary)", fontWeight: 500 }}
                    >
                      {tile.title}
                    </h3>
                    <p className="type-caption mt-1">{tile.caption}</p>
                  </div>
                  <MonoTag tone="amber">POWERED BY MAVERICH</MonoTag>
                </div>
              </article>
            </Parallax>
          ))}
        </div>
      </div>
    </section>
  );
}
