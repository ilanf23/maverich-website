"use client";

import { motion, AnimatePresence } from "motion/react";
import { useIntro } from "@/components/providers/intro-provider";

const REVEAL_EASE = [0.16, 1, 0.3, 1] as const;

/**
 * SkipIntroButton — bottom-right control visible only while the intro
 * is playing. Fades in shortly after the cinematic starts so it doesn't
 * compete with the establishing frame; clicking it calls
 * IntroProvider.skip() which marks the visit "seen" and snaps the
 * scene to its final frame via the post-intro lerp handoff.
 */
export function SkipIntroButton() {
  const { phase, skip } = useIntro();

  return (
    <AnimatePresence>
      {phase === "playing" && (
        <motion.button
          key="skip-intro"
          type="button"
          onClick={skip}
          className="type-mono-tag fixed bottom-6 right-6 z-[55] rounded-full px-4 py-2"
          style={{
            color: "var(--ink-secondary)",
            border: "1px solid var(--border-subtle)",
            background: "var(--surface-glass)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 0.55, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: REVEAL_EASE, delay: 1.2 }}
          aria-label="Skip cinematic intro"
        >
          SKIP INTRO →
        </motion.button>
      )}
    </AnimatePresence>
  );
}
