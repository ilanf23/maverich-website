"use client";

import { useState } from "react";

/**
 * Returns true when the device should render the low-fidelity scene
 * variant. Heuristic: no-hover (touch primary) + small viewport, or
 * low device pixel ratio + slow connection.
 *
 * Detection runs once via useState lazy initializer; we don't track
 * viewport resize because the user can't suddenly grow their device
 * into a desktop.
 */
export function useLowFidelityMode(): boolean {
  const [low] = useState(() => {
    if (typeof window === "undefined") return false;
    const noHover = window.matchMedia("(hover: none)").matches;
    const smallViewport = window.innerWidth < 900;
    const lowDpr = window.devicePixelRatio < 2;
    const conn =
      "connection" in navigator
        ? (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
        : undefined;
    const slowConn =
      conn?.effectiveType === "2g" || conn?.effectiveType === "3g";
    return (noHover && smallViewport) || (lowDpr && slowConn);
  });

  return low;
}
