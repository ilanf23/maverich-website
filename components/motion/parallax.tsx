"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

/**
 * Parallax — element moves at a configurable rate against scroll.
 *
 *   speed = 1     moves with scroll (no visible offset)
 *   speed = 0     fixed
 *   speed = 0.5   moves at half scroll rate (background feel)
 *   speed = 2     moves twice as fast (foreground rush)
 *   speed = -0.5  moves opposite at half rate
 *
 * Tracks the element against the viewport; no global setup required.
 * Skips transform entirely under prefers-reduced-motion.
 */
export function Parallax({
  children,
  speed = 0.5,
  className,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // progress goes 0 → 1 across the full pass-through.
  // Shift by (1 - speed) so speed=1 is neutral and speed=0 pins the element.
  // We express the range in viewport heights so the effect scales with the section size.
  const range = 100 * (1 - speed);
  const y = useTransform(scrollYProgress, [0, 1], [`${-range / 2}%`, `${range / 2}%`]);

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div ref={ref} className={className} style={{ y, willChange: "transform" }}>
      {children}
    </motion.div>
  );
}
