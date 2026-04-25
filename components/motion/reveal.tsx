"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Reveal — primary entrance primitive.
 * Element starts at opacity 0, translateY 40px.
 * Reveals via ease-out-expo over 800ms (--dur-emphatic).
 * Triggers when 10% of the element enters the viewport.
 *
 * Honors prefers-reduced-motion: skips animation entirely.
 *
 * Usage:
 *   <Reveal delay={0.1}>
 *     <h2>Section heading</h2>
 *   </Reveal>
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
