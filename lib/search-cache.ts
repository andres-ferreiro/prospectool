import type { BusinessRow } from "@/lib/db/types";

// Persists the last keyword search per project so switching between the
// map and CRM tabs (which fully unmounts/remounts BusinessMap) doesn't
// re-run the DENUE search just to show the same pins again — the drawer
// can hydrate straight from here instead. Also doubles as the offline
// story: with no connection, a fresh mount still has something to show.
const TTL_MS = 15 * 60 * 1000;
const PREFIX = "lead-finder:search:";

export interface CachedSearch {
  businesses: BusinessRow[];
  keywordEntries: [string, string[]][];
  center: { lat: number; lng: number };
  radiusM: number;
  cachedAt: number;
}

function storageKey(projectId: string) {
  return `${PREFIX}${projectId}`;
}

export function readCachedSearch(projectId: string): CachedSearch | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSearch;
    if (Date.now() - parsed.cachedAt > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedSearch(projectId: string, data: Omit<CachedSearch, "cachedAt">) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(projectId), JSON.stringify({ ...data, cachedAt: Date.now() }));
  } catch {
    // Storage full or unavailable (private browsing) — caching is a nice-to-have.
  }
}

export function clearCachedSearch(projectId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(projectId));
  } catch {
    // Ignore.
  }
}
