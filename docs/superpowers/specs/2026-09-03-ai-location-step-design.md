# Location step for AI-driven project creation (Piece 2)

## Problem

Piece 1 ([2026-09-03-ai-scian-code-selection-design.md](2026-09-03-ai-scian-code-selection-design.md)) taught the AI-suggestion endpoint to pick real SCIAN category codes, but nothing consumes them yet — the shipped UI still only reads `.keywords`. Running a category-level search (`Advanced Search`) needs a location (Estado + Municipio), which project creation never collects. This piece closes that gap: after an AI-assisted project is created, ask the user to share their location (or pick it manually), then run a real category search with the AI's codes using infrastructure that already exists.

## Scope

In scope:
- Wire `scianCodes` from the AI suggestion response through to project creation for the first time (currently silently ignored by the shipped UI).
- A new full-screen location step, shown after project creation, only when the AI suggested at least one usable SCIAN code.
- Reuse the *existing* Advanced Search machinery (`runAdvancedSearch` in [business-map.tsx](../../../components/map-view/business-map.tsx), and its `AdvancedSearchProgress` UI) to actually run the category search once a location is known — no new search or progress code.
- Extract the reverse-geocode-to-Entidad/Municipio logic already in [advanced-search-drawer.tsx](../../../components/map-view/advanced-search-drawer.tsx) into a shared helper, since this piece needs the identical transformation.

Out of scope (deferred):
- Persisting the resolved location or the `scianCodes` anywhere — this is a one-time, in-memory hand-off from project creation to the search kickoff, same philosophy as the two describe-step inputs never being persisted.
- Any change to the *existing* "Nuevo proyecto" modal's own flow (describe → keywords → create) — it stays exactly as shipped.
- A combined keyword+category progress display, or a layers-pane distinction between the two result sources — that's Piece 3/4, now a lighter polish pass since this piece proves out the real search path.

## Design

### Trigger wiring

`AiDescribeStep`'s `onSuggested` callback gains a second parameter: `(keywords: string[], scianCodes: string[]) => void`. It reads `data.scianCodes` from the same `/api/ai/suggest-keywords` response it already fetches (the field has existed on the wire since Piece 1; nothing reads it yet).

`CreateProjectDrawer` stores the codes in a new `initialScianCodes` state alongside the existing `initialKeywords`.

**Important constraint discovered while planning this piece:** `app-shell.tsx`'s `handleCreated` calls `router.push(`/proyectos/${project.id}`)` after creation, and `/proyectos/[id]/page.tsx` is a server component — so this navigation fully remounts `AppShell` as a brand-new instance for the new route. Any `scianCodes` held in the *old* instance's React state would be lost before the new instance ever mounts; extending `onCreated`'s prop signature to carry them through doesn't survive this boundary.

Instead, `CreateProjectDrawer` stashes the codes in `sessionStorage` (a new small helper, `lib/pending-ai-search.ts`, following the same one-shot browser-storage pattern already used for onboarding hints in `lib/onboarding.ts`) keyed by the new project's id, right before calling the existing, unchanged `onCreated(project)`. `AppShell` reads and immediately clears that entry in an effect keyed on `activeProject.id` (alongside its existing per-project effects) — if non-empty, it shows the new location overlay instead of leaving the user straight on the map. If empty (the user clicked "Omitir, elegir manualmente" at the describe step, none of the AI's suggestions passed catalog validation, or `sessionStorage` is unavailable), behavior is unchanged from today — land on the map with keyword results only.

### The location overlay

One screen, no internal sub-navigation, dismissible (backdrop/Esc) with dismissal treated identically to the explicit skip:

1. Primary button: "Compartir mi ubicación." A plain click handler calling `navigator.geolocation.getCurrentPosition` directly — no pre-checking permission state via the Permissions API (unnecessary complexity: if permission was already granted from the map's own background location hook, the call just resolves instantly with no visible prompt; if not, the browser shows its native prompt as expected either way).
2. On success, the coordinates are reverse-geocoded to an Entidad + Municipio via the new shared helper (see below). On success, the location is resolved and the search kicks off (see Wiring below). On failure (denied, unavailable, or the reverse-geocode not matching a known Entidad), the user falls through to option 3 with an inline note.
3. Always visible below the button: the same Estado/Municipio `SimpleCombobox` pickers `AdvancedSearchDrawer` already uses, as a direct manual alternative — pick both, press "Continuar" to resolve the location that way instead.
4. A skip link: "Buscar solo con palabras clave por ahora" — dismisses the overlay, landing on the map exactly as it does today. The `scianCodes` are simply discarded; the user can always run Advanced Search manually later with the exact same categories if they choose to (nothing about this piece prevents that).

### Shared reverse-geocode helper

New file `lib/geo-mx.ts`, exporting `reverseGeocodeToEntidadMunicipio(coords: { lat: number; lng: number }): Promise<{ entidad: string | null; municipio: string | null }>` — the Mapbox reverse-geocode-then-fuzzy-match-against-`ENTIDADES`/`MUNICIPIOS` logic currently inlined in `AdvancedSearchDrawer`'s prefill effect, extracted verbatim (same fuzzy-match helper, same Mapbox endpoint, same "only fill Municipio if Entidad matched" behavior). `AdvancedSearchDrawer` is updated to call this helper instead of duplicating the logic; the new location overlay calls the same helper.

### Wiring to the real search

`BusinessMapHandle` (the existing imperative ref interface in `business-map.tsx`, which already exposes `flyToAndSearch`) gains a new method: `runAdvancedSearch: (codes: string[], entidad: string, municipio: string) => void` — a thin pass-through to the *already-existing* internal `runAdvancedSearch` callback at `business-map.tsx:301`, no change to that function's logic. `app-shell.tsx` calls `mapRef.current?.runAdvancedSearch(pendingAiSearch, entidad, municipio)` once a location resolves (either GPS or manual), then clears `pendingAiSearch` to dismiss the overlay. The existing `AdvancedSearchProgress` card takes over from there automatically — the same background search, the same progress card the user would see from manually opening Advanced Search today.

## Error handling

- Geolocation failure (denied, timeout, unsupported): no error dialog — the manual Estado/Municipio pickers are already visible as the fallback, so failure just means the GPS path didn't shortcut past them.
- Reverse-geocode failure (Mapbox error, or no fuzzy match found): same — falls through to manual pickers, consistent with how `AdvancedSearchDrawer`'s existing prefill effect already treats this as best-effort, not an error state.
- If `runAdvancedSearch` itself fails for some reason once called: unchanged — that's entirely `AdvancedSearchProgress`'s existing failure handling (the `failed` count it already tracks), nothing new introduced here.

## Testing

- Unit tests for `reverseGeocodeToEntidadMunicipio`'s fuzzy-matching logic against `ENTIDADES`/`MUNICIPIOS` (mocking the Mapbox fetch call) — this is the one piece of genuinely new logic (extracted, not just moved, since it becomes independently testable outside the drawer component for the first time).
- No new automated test for the overlay UI itself or the `runAdvancedSearch` ref wiring (consistent with how `AdvancedSearchDrawer` itself has no tests today) — manual verification: create a project via the AI flow with a product/audience pair expected to produce real SCIAN codes, confirm the location overlay appears, confirm both the GPS path and the manual-picker path each correctly kick off a real Advanced Search visible via the existing progress card, and confirm skipping lands on the map with keyword results only (today's unchanged behavior).
