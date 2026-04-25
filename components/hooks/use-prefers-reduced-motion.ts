import { useSyncExternalStore } from "react";

/**
 * usePrefersReducedMotion — hydration-safe read of the user's reduced
 * motion preference. Implemented via useSyncExternalStore so we never
 * call setState in an effect just to fork rendering on a client-only
 * preference.
 *
 * Server snapshot returns false (motion-allowed); client snapshot reads
 * the live matchMedia result. React handles the hydration boundary —
 * SSR + initial client paint render as motion-allowed, then re-render
 * with the actual preference once mounted.
 */
const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getClientSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
