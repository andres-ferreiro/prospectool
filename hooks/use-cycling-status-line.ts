"use client";

import { useEffect, useState } from "react";

const DEFAULT_INTERVAL_MS = 1800;

// "Status line shimmers, then swaps to the next" — cycles through a list of
// phrases at a fixed interval while `active`, resetting to the first phrase
// once it stops. Pair with the .shimmer-text/.status-line-swap CSS classes
// (globals.css) and key the rendered element by the returned line so React
// remounts it and replays the swap-in animation on each change.
export function useCyclingStatusLine(
  active: boolean,
  lines: string[],
  intervalMs: number = DEFAULT_INTERVAL_MS
): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    const id = setInterval(() => setIndex((i) => (i + 1) % lines.length), intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, intervalMs]);

  return lines[index];
}
