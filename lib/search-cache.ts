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

// Advanced (SCIAN-code) search results get their own cache entry, separate
// from the keyword search above. They're stored independently rather than
// as extra fields on CachedSearch so an advanced-only cache entry can never
// be mistaken for "the keyword search already ran" (business-map.tsx's
// auto-search effect treats any cached keyword entry, even an empty one, as
// a signal to skip re-searching) and vice versa.
export interface CachedAdvancedSearch {
  results: BusinessRow[];
  resultCodeEntries: [string, string[]][];
  codes: string[];
  cachedAt: number;
}

function advancedStorageKey(projectId: string) {
  return `${PREFIX}${projectId}:advanced`;
}

export function readCachedAdvancedSearch(projectId: string): CachedAdvancedSearch | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(advancedStorageKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedAdvancedSearch;
    if (Date.now() - parsed.cachedAt > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedAdvancedSearch(projectId: string, data: Omit<CachedAdvancedSearch, "cachedAt">) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(advancedStorageKey(projectId), JSON.stringify({ ...data, cachedAt: Date.now() }));
  } catch {
    // Storage full or unavailable (private browsing) — caching is a nice-to-have.
  }
}

export function clearCachedAdvancedSearch(projectId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(advancedStorageKey(projectId));
  } catch {
    // Ignore.
  }
}
