"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  useIntroAnimation,
  type IntroPhase,
} from "@/components/3d/intro-animation";
import { useLenis } from "./lenis-provider";

/**
 * IntroProvider — top-level orchestration of the cinematic intro state.
 *
 * Three lifecycle decisions made here:
 *   1. Should the intro play at all? (no on mobile or reduced-motion)
 *   2. Drive progress + phase from the useIntroAnimation hook
 *   3. Side-effects: lock page scroll while phase === "playing"
 *
 * Consumed by:
 *   • <SiteHeader>          → fades in when phase === "complete"
 *   • <HeroSection>         → drives the canvas progress + skip button
 *   • <ScrollProgress>      → hidden until phase === "complete"
 *
 * Mounted INSIDE <LenisProvider> so it can stop/start Lenis directly.
 *
 * Performance: progress is exposed as a ref, NOT React state, so the
 * 60Hz progress updates do not re-render every context consumer. Only
 * `phase` is reactive — and it transitions ~3 times across the intro.
 */
type IntroContextValue = {
  /** Mutable, frame-accurate. Read .current inside useFrame or rAF. */
  progressRef: React.MutableRefObject<number>;
  phase: IntroPhase;
  skip: () => void;
  /** True when intro mode actually applies — false on mobile/reduced-motion. */
  active: boolean;
};

function makeDefaultValue(): IntroContextValue {
  // Static fallback — used by SSR and pre-decision render. progressRef is
  // a fresh ref so consumers can still .current it without crashing.
  return {
    progressRef: { current: 1 } as React.MutableRefObject<number>,
    phase: "complete",
    skip: () => {},
    active: false,
  };
}

const IntroContext = createContext<IntroContextValue>(makeDefaultValue());

export function useIntro(): IntroContextValue {
  return useContext(IntroContext);
}

type Decision = "undecided" | "play" | "skip";

export function IntroProvider({ children }: { children: React.ReactNode }) {
  const [decision, setDecision] = useState<Decision>("undecided");
  const lenisRef = useLenis();

  // Stable ref for the "skip" / "undecided" branches — keeps the value
  // identity-stable across renders so consumers don't see a "new" ref.
  const fallbackProgressRef = useRef(1);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    setDecision(reduced || mobile ? "skip" : "play");
  }, []);

  const intro = useIntroAnimation({ enabled: decision === "play" });

  // Resolve the value exposed to consumers based on decision. We avoid
  // creating new objects every render by keeping decision-bucket
  // construction explicit — the hook return is stable across renders
  // because phase only changes on transitions.
  let value: IntroContextValue;
  if (decision === "skip") {
    fallbackProgressRef.current = 1;
    value = {
      progressRef: fallbackProgressRef,
      phase: "complete",
      skip: () => {},
      active: false,
    };
  } else if (decision === "undecided") {
    fallbackProgressRef.current = 0;
    value = {
      progressRef: fallbackProgressRef,
      phase: "idle",
      skip: () => {},
      active: false,
    };
  } else {
    value = {
      progressRef: intro.progressRef,
      phase: intro.phase,
      skip: intro.skip,
      active: true,
    };
  }

  // Page-wide scroll lock while the intro is playing.
  useEffect(() => {
    const playing = value.phase === "playing";
    if (playing) {
      const prevHtml = document.documentElement.style.overflow;
      const prevBody = document.body.style.overflow;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      lenisRef?.current?.stop();
      // HMR or refresh-mid-scroll could leave us partway down — pin top
      // so the user actually sees the cinematic establishing frame.
      window.scrollTo(0, 0);
      return () => {
        document.documentElement.style.overflow = prevHtml;
        document.body.style.overflow = prevBody;
        lenisRef?.current?.start();
      };
    }
    return undefined;
  }, [value.phase, lenisRef]);

  return (
    <IntroContext.Provider value={value}>{children}</IntroContext.Provider>
  );
}
