export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Warm sunrise haze — placeholder atmospheric (real R3F scene replaces this in Phase 4) */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: "60vh",
          background:
            "radial-gradient(ellipse at 50% 0%, var(--warm-haze-bright) 0%, var(--warm-haze) 30%, transparent 70%)",
          opacity: 0.5,
        }}
      />

      {/* Cool deep haze at the lower corners */}
      <div
        className="absolute bottom-0 left-0 pointer-events-none"
        style={{
          width: "40vw",
          height: "40vh",
          background:
            "radial-gradient(ellipse at 0% 100%, var(--cool-haze-bright) 0%, transparent 70%)",
          opacity: 0.4,
        }}
      />
      <div
        className="absolute bottom-0 right-0 pointer-events-none"
        style={{
          width: "40vw",
          height: "40vh",
          background:
            "radial-gradient(ellipse at 100% 100%, var(--cool-haze-bright) 0%, transparent 70%)",
          opacity: 0.4,
        }}
      />

      {/* Hero content */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-24">
        {/* Mono call-sign tag */}
        <div
          className="mb-12 tracking-[0.3em] uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            color: "var(--accent-amber)",
          }}
        >
          [CALL SIGN: MAVERICH \\ PHASE 2 ✓]
        </div>

        {/* Display headline */}
        <h1
          className="text-center"
          style={{
            fontFamily: "var(--font-fraunces)",
            fontSize: "clamp(3rem, 11vw, 9rem)",
            lineHeight: 0.95,
            letterSpacing: "-0.04em",
            color: "var(--ink-primary)",
            fontWeight: 500,
          }}
        >
          Vibe-coded
          <br />
          <span style={{ color: "var(--accent-amber)" }}>
            operating systems.
          </span>
        </h1>

        {/* Subhead */}
        <p
          className="mt-10 max-w-2xl text-center"
          style={{
            fontSize: "clamp(1rem, 1.4vw, 1.375rem)",
            color: "var(--ink-secondary)",
            lineHeight: 1.55,
          }}
        >
          We build the software that runs the businesses that don&apos;t have time
          to build software.
        </p>

        {/* Build status pill */}
        <div
          className="mt-20 inline-flex items-center gap-2 px-4 py-2"
          style={{
            background: "var(--surface-glass)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "9999px",
            color: "var(--ink-secondary)",
            fontSize: "0.75rem",
            fontFamily: "var(--font-mono)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--accent-amber)" }}
          />
          v0.1 — site under construction
        </div>
      </section>

      {/* Spacer to prove smooth scroll is wired up */}
      <section className="relative min-h-[80vh] flex items-center justify-center">
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            color: "var(--ink-muted)",
            letterSpacing: "0.2em",
          }}
        >
          [ SCROLL TEST :: LENIS ACTIVE ]
        </p>
      </section>

      {/* Footer attribution */}
      <footer
        className="relative py-12 text-center"
        style={{
          color: "var(--ink-muted)",
          fontSize: "0.75rem",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.1em",
        }}
      >
        © 2026 Maverich.ai \\ Built by humans \\ Jacksonville, FL
      </footer>
    </main>
  );
}
