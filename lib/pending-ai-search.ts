// One-shot hand-off for the SCIAN codes an AI-assisted project creation
// produced, from the creation flow to the next page load — plain React
// state can't make this trip, since app-shell.tsx's post-create
// `router.push` to `/proyectos/[id]` remounts AppShell as a fresh instance
// (that route is a server component rendering a new AppShell per
// navigation). sessionStorage survives that; it's cleared on read since
// this is meant to be consumed exactly once, right after the redirect
// that set it. Mirrors the one-shot pattern already used for onboarding
// hints in lib/onboarding.ts.
const PREFIX = "lead-finder:pending-ai-search:";

export function setPendingAiSearch(projectId: string, scianCodes: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${PREFIX}${projectId}`, JSON.stringify(scianCodes));
  } catch {
    // Storage full or unavailable (private browsing) — the location step
    // just won't appear for this project; project creation itself already
    // succeeded regardless.
  }
}

export function takePendingAiSearch(projectId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const key = `${PREFIX}${projectId}`;
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return [];
    window.sessionStorage.removeItem(key);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((code): code is string => typeof code === "string");
  } catch {
    return [];
  }
}
