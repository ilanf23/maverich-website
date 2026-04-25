"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLenis } from "./lenis-provider";
import { usePrefersReducedMotion } from "@/components/hooks/use-prefers-reduced-motion";

/**
 * IntroProvider — owns the cinematic-intro state machine for Phase 4 v2.
 *
 *   loading → playing → complete
 *
 * The intro itself is TIME-driven (not scroll-driven), so progress lives
 * on a ref written each rAF tick — components inside the persistent
 * canvas read this ref from useFrame without re-rendering React.
 *
 * Three lifecycle paths:
 *   1. Default — loader runs while assets stream, then 11s autoplay
 *      intro, then complete. Scroll locked during loading + playing.
 *   2. Returning visitor (localStorage flag set) — loader still runs
 *      to mask asset load, but skips straight from loading → complete.
 *      No 11s wait.
 *   3. prefers-reduced-motion — loader skipped, phase boots at
 *      "complete" instantly. Static fallback hero. No scroll lock.
 *
 * Scroll lock strategy:
 *   • Lenis: lenis.stop() / lenis.start() (smoothes are paused)
 *   • Body overflow: hidden (catches the brief moment before Lenis init)
 *
 * The provider does NOT itself drive any animation. It exposes
 * progressRef to the canvas; the canvas writes to it from inside its
 * own useFrame loop. This avoids a React state update per frame.
 */

const INTRO_DURATION_MS = 11000;
const SEEN_FLAG_KEY = "maverich.intro.seen.v1";

export type IntroPhase = "loading" | "playing" | "complete";

type IntroContextValue = {
  phase: IntroPhase;
  /** 0 → 1 across the 11s intro. Written from rAF; read inside useFrame. */
  progressRef: React.MutableRefObject<number>;
  /** Triggered by the LoadingScreen once assets load + min hold elapses. */
  startIntro: () => void;
  /** Skip-intro button + auto-skip-on-revisit handler. */
  skip: () => void;
  /** Convenience: true while phase ∈ {loading, playing}. */
  active: boolean;
  /** True when the user has seen the intro before — loader still shows
   *  (asset progress) but the 11s autoplay is skipped on this visit. */
  isReturningVisitor: boolean;
};

const IntroContext = createContext<IntroContextValue | null>(null);

export function useIntro(): IntroContextValue {
  const ctx = useContext(IntroContext);
  if (!ctx) {
    throw new Error("useIntro must be used within an IntroProvider");
  }
  return ctx;
}

export function IntroProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useLenis();
  const [internalPhase, setInternalPhase] = useState<IntroPhase>("loading");
  const [isReturningVisitor, setIsReturningVisitor] = useState(false);
  const reduced = usePrefersReducedMotion();

  // Reduced-motion users boot straight to "complete" via this derived
  // value — no setState-in-effect on the preference branch. The
  // internal phase machine still drives transitions for motion-allowed
  // users.
  const phase: IntroPhase = reduced ? "complete" : internalPhase;

  // progressRef is the single source of truth for intro position. Canvas
  // animators read it inside useFrame; HTML overlays read phase only.
  // For reduced-motion users this stays 0 (the canvas never mounts,
  // so its value doesn't matter).
  const progressRef = useRef(0);

  // rAF + start time for the time-driven intro.
  const rafIdRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);

  // Returning-visitor flag — must read localStorage client-side. We
  // subscribe via the storage event so multi-tab sessions stay in sync,
  // which makes the setState here a legitimate external-system sync.
  useEffect(() => {
    const read = () => {
      try {
        setIsReturningVisitor(
          window.localStorage.getItem(SEEN_FLAG_KEY) === "1"
        );
      } catch {
        // localStorage may throw under strict privacy modes — harmless.
      }
    };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

  // Body overflow lock — guarantees no scroll happens before Lenis is
  // ready to take its own .stop() call. Cleared once phase=complete.
  useEffect(() => {
    if (phase === "complete") return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [phase]);

  // Lenis lock — stop smooth scroll while intro is active. Lenis isn't
  // constructed under prefers-reduced-motion so guard for null. The
  // ref's `.current` may also be null between provider mount + Lenis
  // construction; we re-attempt on each phase change so Lenis catches
  // up if it mounted after us.
  useEffect(() => {
    const lenis = lenisRef?.current;
    if (!lenis) return;
    if (phase === "loading" || phase === "playing") {
      lenis.stop();
    } else {
      lenis.start();
    }
  }, [lenisRef, phase]);

  // Start the time-driven intro. Triggered by LoadingScreen once assets
  // are ready + min loader hold has elapsed. Returning visitors skip the
  // 11s autoplay entirely.
  const startIntro = useCallback(() => {
    if (isReturningVisitor) {
      progressRef.current = 1;
      setInternalPhase("complete");
      return;
    }
    setInternalPhase("playing");
    startedAtRef.current = performance.now();
    const tick = (now: number) => {
      const startedAt = startedAtRef.current ?? now;
      const elapsed = now - startedAt;
      const t = Math.min(elapsed / INTRO_DURATION_MS, 1);
      // easeOutQuint — cinematic settle. Matches the v1 keyframe table
      // pacing so the existing waypoints still read with correct beats.
      const eased = 1 - Math.pow(1 - t, 5);
      progressRef.current = eased;
      if (t < 1) {
        rafIdRef.current = requestAnimationFrame(tick);
      } else {
        rafIdRef.current = null;
        setInternalPhase("complete");
        try {
          window.localStorage.setItem(SEEN_FLAG_KEY, "1");
        } catch {
          // ignore — see startIntro returning-visitor branch
        }
      }
    };
    rafIdRef.current = requestAnimationFrame(tick);
  }, [isReturningVisitor]);

  // Skip — fast-forward to complete. Cancels the rAF, marks seen, and
  // flips phase. Camera/jet snap to their final pose via the lerp in
  // PersistentScene (no instant cut).
  const skip = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    progressRef.current = 1;
    setInternalPhase("complete");
    try {
      window.localStorage.setItem(SEEN_FLAG_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const value = useMemo<IntroContextValue>(
    () => ({
      phase,
      progressRef,
      startIntro,
      skip,
      active: phase !== "complete",
      isReturningVisitor,
    }),
    [phase, startIntro, skip, isReturningVisitor]
  );

  return <IntroContext.Provider value={value}>{children}</IntroContext.Provider>;
}
