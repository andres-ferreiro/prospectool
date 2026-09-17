"use client";

import { useEffect, useRef } from "react";

// Two events fire together when returning to a tab (visibilitychange, then
// focus) — collapsing anything closer than this keeps that one return from
// firing two identical requests.
const MIN_INTERVAL_MS = 1000;

/**
 * Runs `refresh` once on mount and again whenever the tab or window comes
 * back to the foreground.
 *
 * Pages like the CRM and the calendar seed their state from server props
 * once (`useState(initialLeads)`), so anything changed elsewhere — another
 * tab, a phone left open on a stale screen, an edit made from the map —
 * stayed invisible until a hard reload. The callback is expected to be
 * silent: no spinner, no toast on failure, since whatever is on screen
 * stays valid until fresher data arrives.
 */
export function useRefreshOnFocus(refresh: () => void | Promise<void>) {
  // Kept in a ref so a caller's inline closure doesn't re-subscribe (and
  // re-fire) the listeners on every render.
  const latest = useRef(refresh);
  useEffect(() => {
    latest.current = refresh;
  });

  useEffect(() => {
    let cancelled = false;
    let lastRunAt = 0;

    const run = () => {
      const now = Date.now();
      if (cancelled || now - lastRunAt < MIN_INTERVAL_MS) return;
      lastRunAt = now;
      void latest.current();
    };

    run();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", run);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", run);
    };
  }, []);
}
