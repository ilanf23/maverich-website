"use client";

import type { ReactNode } from "react";

type Tone = "amber" | "muted" | "subtle";

const TONE_COLOR: Record<Tone, string> = {
  amber: "var(--accent-amber)",
  muted: "var(--ink-secondary)",
  subtle: "var(--ink-muted)",
};

/**
 * MonoTag — atomic component for the [CALL SIGN: X] / [v1.0] mono micro-tags.
 * Single source of truth for that styling. Pure server component — no motion,
 * just typography.
 *
 *   <MonoTag tone="amber">CALL SIGN: MAVERICH</MonoTag>
 *   <MonoTag tone="muted">v0.1 — site under construction</MonoTag>
 *
 * Square brackets are rendered by the component so callers only supply the
 * inner text. `bracket={false}` opts out for pill/status use.
 */
export function MonoTag({
  children,
  tone = "amber",
  bracket = true,
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  bracket?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`type-mono-tag ${className}`}
      style={{ color: TONE_COLOR[tone] }}
    >
      {bracket ? "[ " : null}
      {children}
      {bracket ? " ]" : null}
    </span>
  );
}
