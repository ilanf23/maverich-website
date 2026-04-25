"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type IntroPhase = "idle" | "playing" | "complete";

const INTRO_DURATION_MS = 11000;
const STORAGE_KEY = "maverich-intro-seen";

/**
 * useIntroAnimation — time-based progress controller for the cinematic
 * hero intro. Replaces the v1 scroll-driven progress with an autonomous
 * 0→1 ramp over ~11 seconds, eased with easeOutQuint.
 *
 * Phase machine:
 *   idle      — first render before useEffect mounts the RAF loop
 *   playing   — RAF advancing progress; UI hidden, scroll locked
 *   complete  — final frame held, UI fades in, scroll unlocked
 *
 * IMPORTANT — progress is exposed as a MUTABLE REF, not React state.
 * It updates 60×/sec; routing it through state would re-render every
 * consumer of useIntro() each frame (header, scroll-progress, sections),
 * which is catastrophic. Phase is the only React state; consumers that
 * need per-frame progress read progressRef.current inside their own
 * animation loop or useFrame.
 *
 * Respects:
 *   • prefers-reduced-motion → jumps straight to "complete"
 *   • localStorage flag → returning visitors auto-skip
 *   • imperative skip() → user clicks "Skip intro"
 */
export function useIntroAnimation({
  enabled = true,
}: { enabled?: boolean } = {}) {
  const [phase, setPhase] = useState<IntroPhase>("idle");
  const progressRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const skippedRef = useRef(false);

  const finish = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage unavailable (private browsing) — graceful no-op.
    }
  }, []);

  const skip = useCallback(() => {
    if (skippedRef.current) return;
    skippedRef.current = true;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    progressRef.current = 1;
    setPhase("complete");
    finish();
  }, [finish]);

  useEffect(() => {
    if (!enabled) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let seen = false;
    try {
      seen = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // ignore
    }

    if (reduced || seen) {
      progressRef.current = 1;
      setPhase("complete");
      return;
    }

    setPhase("playing");
    startedAtRef.current = performance.now();

    const tick = (now: number) => {
      if (skippedRef.current) return;
      const elapsed = now - (startedAtRef.current ?? now);
      const t = Math.min(elapsed / INTRO_DURATION_MS, 1);
      // easeOutQuint — long, cinematic deceleration that lets the final
      // settling frame breathe.
      const eased = 1 - Math.pow(1 - t, 5);
      progressRef.current = eased;
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        setPhase("complete");
        finish();
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, finish]);

  return { progressRef, phase, skip };
}

export const INTRO_STORAGE_KEY = STORAGE_KEY;
