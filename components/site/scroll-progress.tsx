"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";

/**
 * ScrollProgress — thin amber hairline at the top of the viewport that fills
 * horizontally as the user scrolls the page. Smoothed with a spring so Lenis
 * momentum doesn't show as a jittery advance.
 *
 * Hidden under prefers-reduced-motion (the bar is pure decoration — page
 * position is already communicated by the native scrollbar).
 */
export function ScrollProgress() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const width = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    mass: 0.4,
    restDelta: 0.001,
  });

  if (reduced) return null;

  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left"
      style={{
        scaleX: width,
        background:
          "linear-gradient(90deg, var(--accent-amber) 0%, var(--accent-amber-glow) 100%)",
      }}
    />
  );
}
