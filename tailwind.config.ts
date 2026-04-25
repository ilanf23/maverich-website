import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-deep": "var(--bg-deep)",
        "bg-elevated": "var(--bg-elevated)",
        "ink-primary": "var(--ink-primary)",
        "ink-secondary": "var(--ink-secondary)",
        "ink-muted": "var(--ink-muted)",
        "accent-amber": "var(--accent-amber)",
        "accent-amber-glow": "var(--accent-amber-glow)",
        "accent-cool": "var(--accent-cool)",
        "warm-haze": "var(--warm-haze)",
        "cool-haze": "var(--cool-haze)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      transitionTimingFunction: {
        emphasized: "cubic-bezier(0.2, 0, 0, 1)",
        camera: "cubic-bezier(0.65, 0, 0.35, 1)",
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        instant: "80ms",
        quick: "200ms",
        base: "400ms",
        emphatic: "800ms",
        cinematic: "1400ms",
      },
    },
  },
  plugins: [],
};

export default config;
