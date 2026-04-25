"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, type ReactNode } from "react";

type FrameLoop = "always" | "demand" | "never";

/**
 * CanvasProvider — thin R3F <Canvas> wrapper with brand defaults.
 *
 * - dpr capped at 1.5 (retina without burning the GPU)
 * - frameloop defaults to "demand" (battery-friendly); pass "always" for
 *   continuously animated scenes like the hero.
 * - alpha: true so the canvas blends over the page background.
 * - pointer-events: none so HTML overlays remain clickable.
 *
 * SSR safety: this component is "use client", but consumers should still
 * dynamic-import the scene that uses it with `{ ssr: false }` so that
 * three.js / drei never enter the server bundle.
 */
export function CanvasProvider({
  children,
  className = "absolute inset-0",
  frameloop = "demand",
}: {
  children: ReactNode;
  className?: string;
  frameloop?: FrameLoop;
}) {
  return (
    <div className={`${className} pointer-events-none`}>
      <Canvas
        dpr={[1, 1.5]}
        frameloop={frameloop}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
      >
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </div>
  );
}
