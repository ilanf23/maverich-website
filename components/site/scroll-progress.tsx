"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { useIntro } from "@/components/providers/intro-provider";

/**
 * ScrollProgress — thin amber hairline at the top of the viewport that
 * fills horizontally as the user scrolls. Smoothed with a spring so
 * Lenis momentum doesn't show as a jittery advance.
 *
 * Hidden:
 *   • Under prefers-reduced-motion (pure decoration; native scrollbar
 *     already communicates page position)
 *   • During the intro animation (no scroll possible; bar would be a
 *     fixed zero-width stub anyway, but we hide it for visual cleanness)
 */
export function ScrollProgress() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const { phase } = useIntro();
  const width = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    mass: 0.4,
    restDelta: 0.001,
  });

  if (reduced) return null;
  if (phase !== "complete") return null;

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
