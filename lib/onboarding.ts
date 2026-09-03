// One-time, ever-shown-once hint flags — separate from search-cache.ts's
// per-project TTL cache since these never expire and aren't project-scoped.
const PREFIX = "lead-finder:seen:";

function hasSeen(key: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(`${PREFIX}${key}`) === "1";
  } catch {
    return true;
  }
}

function markSeen(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${PREFIX}${key}`, "1");
  } catch {
    // Storage full or unavailable (private browsing) — worst case the hint
    // reappears next visit, not a functional problem.
  }
}

// Explains what the telescope (Búsqueda avanzada) and eye-toggle icons do —
// both non-standard iconography with no other in-app explanation.
export function hasSeenMapControlsHint(): boolean {
  return hasSeen("map-controls-hint");
}

export function markMapControlsHintSeen(): void {
  markSeen("map-controls-hint");
}
