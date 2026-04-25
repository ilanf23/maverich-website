"use client";

import dynamic from "next/dynamic";
import { usePrefersReducedMotion } from "@/components/hooks/use-prefers-reduced-motion";

/**
 * PersistentCanvasMount — fixed-position mount point for the page-wide
 * 3D scene. Held outside the scrollable <main> so the canvas never
 * scrolls; sections sit above it at z-2 and scroll normally on top.
 *
 * Render paths:
 *   • Default (desktop, motion-allowed): full PersistentScene renders.
 *   • Reduced-motion: PersistentScene is suppressed entirely. The hero
 *     section's static SVG fallback covers the section, and the rest of
 *     the page reads against its native dark background — same brand
 *     surface, no motion required.
 *   • Mobile (<768px): keep the canvas (reduced quality via dpr cap in
 *     CanvasProvider). v2 wants the persistent jet on mobile too; only
 *     the deepest fallback (reduced-motion) suppresses it.
 *
 * Three.js / drei live inside PersistentScene and are dynamic-imported
 * with ssr:false so they never enter the server bundle. The dynamic
 * import already covers SSR — usePrefersReducedMotion uses
 * useSyncExternalStore so the SSR/CSR boundary is handled without a
 * setState-in-effect mounted gate.
 */

const PersistentScene = dynamic(
  () => import("./persistent-scene").then((m) => m.PersistentScene),
  { ssr: false, loading: () => null }
);

export function PersistentCanvasMount() {
  const reduced = usePrefersReducedMotion();
  if (reduced) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1]"
      style={{ contain: "strict" }}
    >
      <PersistentScene />
    </div>
  );
}
