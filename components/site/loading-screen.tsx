"use client";

import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import { useIntro } from "@/components/providers/intro-provider";

const MIN_HOLD_MS = 1100;
const MAX_HOLD_MS = 4500;

/**
 * LoadingScreen — Maverich-branded loader shown during phase === "loading".
 *
 * Brand moment, peachweb-style: the user sees the M and an amber progress
 * bar BEFORE the cinematic intro starts. Three release conditions must
 * all hold before we hand off to startIntro():
 *
 *   1. THREE.DefaultLoadingManager reports progress >= 100 (or no loaders
 *      have started — e.g. assets cached on revisit).
 *   2. Minimum hold time elapsed (so the loader never flashes).
 *   3. Capped maximum hold time as a safety net so a slow / failing
 *      asset never strands the user on the loader.
 *
 * Drei's useProgress() reads THREE.DefaultLoadingManager, which is
 * global — safe to call from outside the canvas. It returns 0/0 until
 * the first loader registers, so we treat a flat zero with elapsed time
 * past min hold as "no assets to load, ship the user in."
 *
 * Reduced-motion: IntroProvider boots straight to phase === "complete"
 * for these users, so this component renders nothing for them.
 */
export function LoadingScreen() {
  const { phase, startIntro } = useIntro();
  const { progress, active, loaded, total } = useProgress();
  const reduced = useReducedMotion();

  const startedAtRef = useRef<number | null>(null);
  const startedRef = useRef(false);
  const [displayProgress, setDisplayProgress] = useState(0);

  // Track when this screen first mounted — drives min hold + max hold.
  useEffect(() => {
    if (phase !== "loading") return;
    if (startedAtRef.current === null) {
      startedAtRef.current = performance.now();
    }
  }, [phase]);

  // Smooth the progress bar so it doesn't snap from 0 → 100 in one tick
  // when assets are cached. Lerps toward the live progress + a baseline
  // that climbs with elapsed time so the bar always feels alive even
  // when nothing is loading.
  useEffect(() => {
    if (phase !== "loading") return;
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - (startedAtRef.current ?? performance.now());
      // Baseline: walks 0 → 0.6 over MIN_HOLD_MS so even a "no assets"
      // path shows visible motion.
      const baseline = Math.min(elapsed / MIN_HOLD_MS, 1) * 0.6;
      // Live progress: 0..1
      const live = total > 0 ? progress / 100 : 0;
      const target = Math.max(baseline, live);
      setDisplayProgress((prev) => prev + (target - prev) * 0.18);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, progress, total]);

  // Decide when to release the loader and start the intro.
  useEffect(() => {
    if (phase !== "loading") return;
    if (startedRef.current) return;

    const checkRelease = () => {
      const elapsed = performance.now() - (startedAtRef.current ?? performance.now());
      const minHoldMet = elapsed >= MIN_HOLD_MS;
      const maxHoldHit = elapsed >= MAX_HOLD_MS;
      // Treat "no loaders ever started" (total === 0) as ready, because
      // it means there are no assets to wait on this visit.
      const assetsReady = total === 0 || (!active && progress >= 99);

      if ((minHoldMet && assetsReady) || maxHoldHit) {
        startedRef.current = true;
        startIntro();
      }
    };

    // Run immediately and on every progress change.
    checkRelease();
    const id = window.setInterval(checkRelease, 120);
    return () => window.clearInterval(id);
  }, [phase, progress, active, total, loaded, startIntro]);

  if (reduced) return null;

  return (
    <AnimatePresence>
      {phase === "loading" && (
        <motion.div
          key="loading-screen"
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
          style={{ background: "var(--bg-deep)" }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <MaverichMReveal />
          <ProgressBar progress={displayProgress} />
          <motion.span
            className="type-mono-tag mt-6"
            style={{ color: "var(--ink-muted)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            INITIALIZING FLIGHT SYSTEMS
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * MaverichMReveal — single SVG M with a stroke-draw animation, then a
 * subtle amber pulse. Two paths: the stroke (drawn first) and the fill
 * (revealed after the stroke completes).
 */
function MaverichMReveal() {
  return (
    <motion.svg
      viewBox="0 0 100 80"
      className="h-28 w-28"
      style={{ overflow: "visible" }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* The M shape: two outer slants meeting at the top, V valley in
          the middle. Coordinates kept simple so the brand mark reads
          even at tiny sizes. */}
      <motion.path
        d="M 12 70 L 12 12 L 50 50 L 88 12 L 88 70"
        fill="none"
        stroke="var(--accent-amber)"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
      />
      {/* Amber pulse — appears once the stroke completes. */}
      <motion.path
        d="M 12 70 L 12 12 L 50 50 L 88 12 L 88 70"
        fill="none"
        stroke="var(--accent-amber-glow)"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0] }}
        transition={{
          delay: 1.0,
          duration: 1.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ filter: "blur(3px)" }}
      />
    </motion.svg>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const pct = Math.min(Math.max(progress, 0), 1);
  return (
    <div
      className="mt-10 h-[2px] w-48 overflow-hidden rounded-full"
      style={{ background: "rgba(245, 242, 236, 0.08)" }}
    >
      <motion.div
        className="h-full origin-left"
        style={{
          background:
            "linear-gradient(90deg, var(--accent-amber) 0%, var(--accent-amber-glow) 100%)",
          scaleX: pct,
        }}
      />
    </div>
  );
}
