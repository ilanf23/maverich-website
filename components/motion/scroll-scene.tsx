"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Avoid useLayoutEffect SSR warning — fall back to useEffect on the server.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * ScrollScene — section-pinned wrapper driven by GSAP ScrollTrigger.
 *
 * Pins the section for `height` viewport heights and exposes scroll progress
 * (0–1) to children via render prop. Progress is scroll-linked, which plays
 * better with pinning than Motion's IntersectionObserver-based hooks.
 *
 *   <ScrollScene height={1.5}>
 *     {(progress) => <Canvas cameraZ={-100 * progress} />}
 *   </ScrollScene>
 *
 * Under prefers-reduced-motion, pinning is skipped entirely and progress is
 * frozen at 0 so the scene renders a static first frame.
 */
export function ScrollScene({
  children,
  height = 1.5,
  className,
}: {
  children: (progress: number) => ReactNode;
  height?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    const pinTarget = pinRef.current;
    if (!container || !pinTarget) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: container,
        start: "top top",
        end: `+=${window.innerHeight * height}`,
        pin: pinTarget,
        pinSpacing: true,
        scrub: true,
        onUpdate: (self) => setProgress(self.progress),
      });
    }, container);

    return () => ctx.revert();
  }, [height]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height: `${(1 + height) * 100}vh` }}
    >
      <div ref={pinRef} className="relative h-screen w-full overflow-hidden">
        {children(progress)}
      </div>
    </div>
  );
}
