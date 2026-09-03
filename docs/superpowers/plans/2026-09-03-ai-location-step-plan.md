# AI location step Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a project is created via the AI flow with usable SCIAN codes, show a location step (GPS or manual Estado/Municipio) and use it to kick off a real category search through the app's existing Advanced Search machinery.

**Architecture:** A shared reverse-geocode helper is extracted from `AdvancedSearchDrawer` into `lib/geo-mx.ts`. `BusinessMap` exposes its existing internal advanced-search function through its ref. `AiDescribeStep` and `CreateProjectDrawer` are extended to capture `scianCodes` and hand them to the next page load via `sessionStorage` (since the post-create navigation remounts `AppShell` as a fresh instance — plain React state can't survive that). A new `LocationStepOverlay` component collects a location and calls back into `AppShell`, which resolves the stashed codes and calls the map's exposed search method.

**Tech Stack:** Same as the existing app — Next.js, React, Vitest, `@base-ui/react` (Dialog/Drawer), Mapbox reverse geocoding, browser Geolocation API.

## Global Constraints

- No persistence to the database of the resolved location or the `scianCodes` — `sessionStorage` only, cleared on first read (one-shot hand-off).
- The location overlay must be dismissible (backdrop/Esc) with dismissal behaving identically to the explicit "skip" action — never a hard block.
- `AdvancedSearchDrawer`'s existing behavior must be unchanged after the refactor (same fuzzy-match semantics, same best-effort-on-failure behavior) — this is a pure extraction, not a behavior change.
- Follow the existing `isDesktop` → `Dialog`, else → `Drawer` responsive pattern already used by `CreateProjectDrawer`/`EditProjectDrawer` for any new modal-like UI in this plan.

---

## File Structure

- Create `lib/geo-mx.ts` — shared reverse-geocode-to-Entidad/Municipio helper (pure matching function + the async Mapbox-calling wrapper).
- Create `lib/geo-mx.test.ts` — unit tests for the pure matching function.
- Modify `components/map-view/advanced-search-drawer.tsx` — use the shared helper instead of its own inlined copy.
- Modify `components/map-view/business-map.tsx` — expose `runAdvancedSearch` via `BusinessMapHandle`.
- Create `lib/pending-ai-search.ts` — one-shot `sessionStorage` hand-off helper.
- Modify `components/project-setup/ai-describe-step.tsx` — extract and forward `scianCodes` from the suggestion response.
- Modify `components/project-setup/create-project-drawer.tsx` — capture `scianCodes` and stash them via the new helper before calling `onCreated`.
- Create `components/onboarding/location-step-overlay.tsx` — the new location-collection UI.
- Modify `components/app-shell.tsx` — read the stashed codes on project mount, render the overlay, wire its resolution to the map's exposed search method.

---

### Task 1: Shared reverse-geocode helper

**Files:**
- Create: `lib/geo-mx.ts`
- Test: `lib/geo-mx.test.ts`
- Modify: `components/map-view/advanced-search-drawer.tsx`

**Interfaces:**
- Produces: `interface ReverseGeocodedLocation { entidad: string | null; municipio: string | null }`, `matchEntidadMunicipio(regionText: string | null, placeText: string | null): ReverseGeocodedLocation` (pure, exported for testing), `reverseGeocodeToEntidadMunicipio(coords: { lat: number; lng: number }): Promise<ReverseGeocodedLocation>` (used by Task 5's new overlay component).

- [ ] **Step 1: Write the failing test**

Create `lib/geo-mx.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { matchEntidadMunicipio } from "./geo-mx";

describe("matchEntidadMunicipio", () => {
  it("matches an exact region and place name", () => {
    const result = matchEntidadMunicipio("Ciudad de México", "Coyoacán");
    expect(result).toEqual({ entidad: "09", municipio: "003" });
  });

  it("fuzzy-matches a Mapbox region name against a longer INEGI name", () => {
    // Mapbox's "Coahuila" vs. INEGI's official "Coahuila de Zaragoza".
    const result = matchEntidadMunicipio("Coahuila", null);
    expect(result).toEqual({ entidad: "05", municipio: null });
  });

  it("returns entidad with a null municipio when the place doesn't match any real municipio in that entidad", () => {
    const result = matchEntidadMunicipio("Ciudad de México", "Nonexistent Place XYZ");
    expect(result).toEqual({ entidad: "09", municipio: null });
  });

  it("returns both null when the region doesn't match any real entidad", () => {
    const result = matchEntidadMunicipio("Nonexistent Region XYZ", "Coyoacán");
    expect(result).toEqual({ entidad: null, municipio: null });
  });

  it("returns both null when the region is null", () => {
    const result = matchEntidadMunicipio(null, null);
    expect(result).toEqual({ entidad: null, municipio: null });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- lib/geo-mx.test.ts`
Expected: FAIL — `geo-mx.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

Create `lib/geo-mx.ts`:

```ts
import { ENTIDADES } from "@/lib/inegi/entidades";
import { MUNICIPIOS } from "@/lib/inegi/municipios";
import { normalizeSpanish } from "@/lib/scian/groups";

function fuzzyNameMatch(a: string, b: string): boolean {
  const na = normalizeSpanish(a);
  const nb = normalizeSpanish(b);
  return na.includes(nb) || nb.includes(na);
}

export interface ReverseGeocodedLocation {
  entidad: string | null;
  municipio: string | null;
}

// Pure — fuzzy-matches Mapbox's region/place text against the app's own
// INEGI catalogs (names don't always match exactly, e.g. Mapbox's
// "Coahuila" vs. INEGI's "Coahuila de Zaragoza"), independent of the
// network call so it's unit-testable without mocking fetch.
export function matchEntidadMunicipio(
  regionText: string | null,
  placeText: string | null
): ReverseGeocodedLocation {
  if (!regionText) return { entidad: null, municipio: null };

  const matchedEntidad = ENTIDADES.find((e) => fuzzyNameMatch(e.name, regionText));
  if (!matchedEntidad) return { entidad: null, municipio: null };

  if (!placeText) return { entidad: matchedEntidad.code, municipio: null };
  const matchedMunicipio = MUNICIPIOS.find(
    (m) => m.entidadCode === matchedEntidad.code && fuzzyNameMatch(m.name, placeText)
  );
  return { entidad: matchedEntidad.code, municipio: matchedMunicipio?.municipioCode ?? null };
}

// Reverse-geocodes coordinates to an INEGI Estado + Municipio via Mapbox.
// Best-effort: any failure (missing token, network error, no match)
// resolves to nulls rather than throwing — every caller treats this as an
// optional shortcut past manual Estado/Municipio entry, never a hard
// requirement.
export async function reverseGeocodeToEntidadMunicipio(coords: {
  lat: number;
  lng: number;
}): Promise<ReverseGeocodedLocation> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return { entidad: null, municipio: null };

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?types=region,place&country=mx&access_token=${token}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const features = (data.features ?? []) as { text: string; place_type: string[] }[];
    const regionText = features.find((f) => f.place_type.includes("region"))?.text ?? null;
    const placeText = features.find((f) => f.place_type.includes("place"))?.text ?? null;
    return matchEntidadMunicipio(regionText, placeText);
  } catch {
    return { entidad: null, municipio: null };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- lib/geo-mx.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Refactor `AdvancedSearchDrawer` to use the shared helper**

In `components/map-view/advanced-search-drawer.tsx`:

Remove this import:
```ts
import { normalizeSpanish } from "@/lib/scian/groups";
```

Add this import instead (alongside the existing `ENTIDADES`/`MUNICIPIOS` imports, which stay — they're still used for the dropdown option lists):
```ts
import { reverseGeocodeToEntidadMunicipio } from "@/lib/geo-mx";
```

Remove this function entirely (it now lives in `lib/geo-mx.ts`):
```ts
function fuzzyNameMatch(a: string, b: string): boolean {
  const na = normalizeSpanish(a);
  const nb = normalizeSpanish(b);
  return na.includes(nb) || nb.includes(na);
}
```

Replace the prefill effect:
```ts
  useEffect(() => {
    if (!open || !mapCenter || entidad) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    let cancelled = false;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${mapCenter.lng},${mapCenter.lat}.json?types=region,place&country=mx&access_token=${token}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const features = (data.features ?? []) as { text: string; place_type: string[] }[];
        const regionText = features.find((f) => f.place_type.includes("region"))?.text;
        const placeText = features.find((f) => f.place_type.includes("place"))?.text;
        if (!regionText) return;

        const matchedEntidad = ENTIDADES.find((e) => fuzzyNameMatch(e.name, regionText));
        if (!matchedEntidad) return;
        setEntidad(matchedEntidad.code);

        if (!placeText) return;
        const matchedMunicipio = MUNICIPIOS.find(
          (m) => m.entidadCode === matchedEntidad.code && fuzzyNameMatch(m.name, placeText)
        );
        if (matchedMunicipio) setMunicipio(matchedMunicipio.municipioCode);
      })
      .catch(() => {
        // Best-effort only — leave the fields empty for the user to fill in.
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
```

with:
```ts
  useEffect(() => {
    if (!open || !mapCenter || entidad) return;

    let cancelled = false;
    reverseGeocodeToEntidadMunicipio(mapCenter).then(({ entidad: matchedEntidad, municipio: matchedMunicipio }) => {
      if (cancelled || !matchedEntidad) return;
      setEntidad(matchedEntidad);
      if (matchedMunicipio) setMunicipio(matchedMunicipio);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
```

- [ ] **Step 6: Verify it builds and the full suite still passes**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npm test`
Expected: all pre-existing tests plus the 5 new ones pass.

- [ ] **Step 7: Commit**

```bash
git add lib/geo-mx.ts lib/geo-mx.test.ts components/map-view/advanced-search-drawer.tsx
git commit -m "Extract shared reverse-geocode helper from AdvancedSearchDrawer"
```

---

### Task 2: Expose the existing advanced search through the map's ref

**Files:**
- Modify: `components/map-view/business-map.tsx`

**Interfaces:**
- Produces: `BusinessMapHandle` gains `runAdvancedSearch: (codes: string[], entidad: string, municipio: string) => void`, used by Task 5's `app-shell.tsx` changes.

- [ ] **Step 1: Add the method to the handle interface**

In `components/map-view/business-map.tsx`, change:

```ts
export interface BusinessMapHandle {
  /** Fly the map to a location and immediately search there. */
  flyToAndSearch: (center: { lat: number; lng: number }) => void;
}
```

to:

```ts
export interface BusinessMapHandle {
  /** Fly the map to a location and immediately search there. */
  flyToAndSearch: (center: { lat: number; lng: number }) => void;
  /** Runs the same background category search Advanced Search's drawer
   *  triggers, for callers (like the AI onboarding flow) that already
   *  have codes + a location and don't need the drawer's own UI. */
  runAdvancedSearch: (codes: string[], entidad: string, municipio: string) => void;
}
```

- [ ] **Step 2: Expose the existing internal function through the handle**

Find this block (the internal `runAdvancedSearch` function this task reuses already exists above this point, unchanged):

```ts
  useImperativeHandle(ref, () => ({
    flyToAndSearch: (center) => {
      mapRef.current?.flyTo({ center: [center.lng, center.lat], zoom: 14, duration: 800 });
      runSearch(center, DEFAULT_RADIUS_M);
    },
  }));
```

Replace with:

```ts
  useImperativeHandle(ref, () => ({
    flyToAndSearch: (center) => {
      mapRef.current?.flyTo({ center: [center.lng, center.lat], zoom: 14, duration: 800 });
      runSearch(center, DEFAULT_RADIUS_M);
    },
    runAdvancedSearch,
  }));
```

- [ ] **Step 3: Verify it builds**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add components/map-view/business-map.tsx
git commit -m "Expose runAdvancedSearch through BusinessMapHandle"
```

---

### Task 3: Wire scianCodes through the describe step, and stash them for the next page

**Files:**
- Create: `lib/pending-ai-search.ts`
- Modify: `components/project-setup/ai-describe-step.tsx`
- Modify: `components/project-setup/create-project-drawer.tsx`

**Interfaces:**
- Produces: `setPendingAiSearch(projectId: string, scianCodes: string[]): void`, `takePendingAiSearch(projectId: string): string[]` (from `lib/pending-ai-search.ts`, used by Task 5's `app-shell.tsx`).
- `AiDescribeStepProps.onSuggested` becomes `(keywords: string[], scianCodes: string[]) => void`.

- [ ] **Step 1: Write the storage helper**

Create `lib/pending-ai-search.ts`:

```ts
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
```

- [ ] **Step 2: Extend `AiDescribeStep` to extract and forward `scianCodes`**

In `components/project-setup/ai-describe-step.tsx`, change:

```ts
interface AiDescribeStepProps {
  onSuggested: (keywords: string[]) => void;
  onSkip: () => void;
}
```

to:

```ts
interface AiDescribeStepProps {
  onSuggested: (keywords: string[], scianCodes: string[]) => void;
  onSkip: () => void;
}
```

And change:

```ts
      const data = await res.json();
      const keywords: string[] = Array.isArray(data.keywords) ? data.keywords : [];

      if (keywords.length === 0) {
        toast({
          title: "No encontramos sugerencias",
          description: "Elige tus categorías manualmente",
        });
        onSkip();
        return;
      }

      onSuggested(keywords);
```

to:

```ts
      const data = await res.json();
      const keywords: string[] = Array.isArray(data.keywords) ? data.keywords : [];
      const scianCodes: string[] = Array.isArray(data.scianCodes) ? data.scianCodes : [];

      if (keywords.length === 0) {
        toast({
          title: "No encontramos sugerencias",
          description: "Elige tus categorías manualmente",
        });
        onSkip();
        return;
      }

      onSuggested(keywords, scianCodes);
```

- [ ] **Step 3: Capture and stash the codes in `CreateProjectDrawer`**

In `components/project-setup/create-project-drawer.tsx`, add the import:

```ts
import { setPendingAiSearch } from "@/lib/pending-ai-search";
```

Change:

```ts
  const [step, setStep] = useState<"describe" | "form">("describe");
  const [initialKeywords, setInitialKeywords] = useState<string[]>([]);

  const resetSteps = () => {
    setStep("describe");
    setInitialKeywords([]);
  };
```

to:

```ts
  const [step, setStep] = useState<"describe" | "form">("describe");
  const [initialKeywords, setInitialKeywords] = useState<string[]>([]);
  const [initialScianCodes, setInitialScianCodes] = useState<string[]>([]);

  const resetSteps = () => {
    setStep("describe");
    setInitialKeywords([]);
    setInitialScianCodes([]);
  };
```

Change:

```ts
  const body =
    step === "describe" ? (
      <AiDescribeStep
        onSuggested={(keywords) => {
          setInitialKeywords(keywords);
          setStep("form");
        }}
        onSkip={() => setStep("form")}
      />
    ) : (
      <CreateProjectForm
        initialKeywords={initialKeywords}
        onCreated={(project) => {
          onCreated(project);
          resetSteps();
        }}
      />
    );
```

to:

```ts
  const body =
    step === "describe" ? (
      <AiDescribeStep
        onSuggested={(keywords, scianCodes) => {
          setInitialKeywords(keywords);
          setInitialScianCodes(scianCodes);
          setStep("form");
        }}
        onSkip={() => setStep("form")}
      />
    ) : (
      <CreateProjectForm
        initialKeywords={initialKeywords}
        onCreated={(project) => {
          if (initialScianCodes.length > 0) setPendingAiSearch(project.id, initialScianCodes);
          onCreated(project);
          resetSteps();
        }}
      />
    );
```

- [ ] **Step 4: Verify it builds**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add lib/pending-ai-search.ts components/project-setup/ai-describe-step.tsx components/project-setup/create-project-drawer.tsx
git commit -m "Capture and stash AI-suggested SCIAN codes across project creation"
```

---

### Task 4: Location step overlay

**Files:**
- Create: `components/onboarding/location-step-overlay.tsx`

**Interfaces:**
- Consumes: `reverseGeocodeToEntidadMunicipio` (Task 1), `SimpleCombobox` (`@/components/map-view/simple-combobox`, existing), `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` (`@/components/ui/dialog`, existing), `Drawer`/`DrawerContent`/`DrawerHeader`/`DrawerTitle` (`@/components/ui/drawer`, existing), `useIsDesktop` (`@/hooks/use-media-query`, existing), `ENTIDADES`/`MUNICIPIOS` (existing).
- Produces: `LocationStepOverlay({ open: boolean; onResolved: (entidad: string, municipio: string) => void; onSkip: () => void })` — a React component.

- [ ] **Step 1: Write the component**

Create `components/onboarding/location-step-overlay.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { SimpleCombobox } from "@/components/map-view/simple-combobox";
import { ENTIDADES } from "@/lib/inegi/entidades";
import { MUNICIPIOS } from "@/lib/inegi/municipios";
import { reverseGeocodeToEntidadMunicipio } from "@/lib/geo-mx";
import { useIsDesktop } from "@/hooks/use-media-query";

interface LocationStepOverlayProps {
  open: boolean;
  onResolved: (entidad: string, municipio: string) => void;
  onSkip: () => void;
}

export function LocationStepOverlay({ open, onResolved, onSkip }: LocationStepOverlayProps) {
  const isDesktop = useIsDesktop();
  const [entidad, setEntidad] = useState<string | null>(null);
  const [municipio, setMunicipio] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const entidadOptions = useMemo(() => ENTIDADES.map((e) => ({ value: e.code, label: e.name })), []);
  const municipioOptions = useMemo(
    () =>
      MUNICIPIOS.filter((m) => m.entidadCode === entidad).map((m) => ({
        value: m.municipioCode,
        label: m.name,
      })),
    [entidad]
  );

  const handleShareLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocateError("Tu navegador no soporta ubicación. Elige tu estado y municipio.");
      return;
    }

    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        reverseGeocodeToEntidadMunicipio({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }).then(({ entidad: matchedEntidad, municipio: matchedMunicipio }) => {
          setLocating(false);
          if (matchedEntidad && matchedMunicipio) {
            onResolved(matchedEntidad, matchedMunicipio);
            return;
          }
          setEntidad(matchedEntidad);
          setLocateError("No pudimos identificar tu municipio exacto. Confírmalo abajo.");
        });
      },
      () => {
        setLocating(false);
        setLocateError("No pudimos acceder a tu ubicación. Elige tu estado y municipio.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const canContinue = !!entidad && !!municipio;

  const body = (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <Button size="lg" className="w-full gap-2" onClick={handleShareLocation} disabled={locating}>
        <MapPin className="h-4 w-4" />
        {locating ? "Ubicando…" : "Compartir mi ubicación"}
      </Button>
      {locateError && <p className="text-xs text-destructive">{locateError}</p>}

      <div className="flex items-center gap-2 text-xs text-foreground/40">
        <div className="h-px flex-1 bg-border" />o elige manualmente
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2">
        <Label className="text-foreground/70">Estado</Label>
        <SimpleCombobox
          items={entidadOptions}
          value={entidad}
          onChange={(next) => {
            setEntidad(next);
            setMunicipio(null);
          }}
          placeholder="Buscar estado…"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-foreground/70">Municipio</Label>
        <SimpleCombobox
          items={municipioOptions}
          value={municipio}
          onChange={setMunicipio}
          placeholder={entidad ? "Buscar municipio…" : "Elige un estado primero"}
          disabled={!entidad}
        />
      </div>

      <Button
        size="lg"
        variant="outline"
        className="w-full"
        onClick={() => canContinue && onResolved(entidad!, municipio!)}
        disabled={!canContinue}
      >
        Continuar
      </Button>

      <button
        type="button"
        onClick={onSkip}
        className="text-center text-sm text-foreground/50 underline-offset-2 hover:underline"
      >
        Buscar solo con palabras clave por ahora
      </button>
    </div>
  );

  const title = "¿Dónde buscamos?";
  // Dismissal (backdrop/Esc) behaves exactly like the explicit skip link —
  // this step never hard-blocks the user from reaching the map.
  const handleOpenChange = (next: boolean) => !next && onSkip();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} showSwipeHandle>
      <DrawerContent className="bg-sheet">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        {body}
      </DrawerContent>
    </Drawer>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `npx tsc --noEmit`
Expected: no new type errors introduced by this file (Task 5 wires it in — until then, an unused-import warning for this file itself is not expected since nothing imports it yet, but the file's own internals must type-check standalone).

- [ ] **Step 3: Commit**

```bash
git add components/onboarding/location-step-overlay.tsx
git commit -m "Add LocationStepOverlay component"
```

---

### Task 5: Wire it all into AppShell

**Files:**
- Modify: `components/app-shell.tsx`

**Interfaces:**
- Consumes: `takePendingAiSearch` (Task 3), `LocationStepOverlay` (Task 4), `BusinessMapHandle.runAdvancedSearch` (Task 2).

- [ ] **Step 1: Add imports and state**

In `components/app-shell.tsx`, add these imports alongside the existing ones:

```ts
import { LocationStepOverlay } from "@/components/onboarding/location-step-overlay";
import { takePendingAiSearch } from "@/lib/pending-ai-search";
```

Add new state, alongside the existing `useState` calls:

```ts
  const [pendingAiCodes, setPendingAiCodes] = useState<string[] | null>(null);
```

- [ ] **Step 2: Read the stashed codes when a project mounts**

Add a new effect, alongside the existing per-project effects (e.g. right after the leads/saved-businesses loading effect):

```ts
  // One-shot: if this project was just created via the AI flow with usable
  // SCIAN codes, they were stashed in sessionStorage before the redirect
  // that brought us here (see lib/pending-ai-search.ts) — surface the
  // location step to act on them. Reading also clears the entry, so this
  // never re-fires on a later revisit to the same project.
  useEffect(() => {
    if (!activeProject) return;
    const codes = takePendingAiSearch(activeProject.id);
    if (codes.length > 0) setPendingAiCodes(codes);
  }, [activeProject]);
```

- [ ] **Step 3: Add the resolution/skip handlers**

Add, alongside the other handlers (e.g. after `handleSaved`):

```ts
  const handleLocationResolved = (entidad: string, municipio: string) => {
    if (pendingAiCodes) mapRef.current?.runAdvancedSearch(pendingAiCodes, entidad, municipio);
    setPendingAiCodes(null);
  };

  const handleLocationSkip = () => setPendingAiCodes(null);
```

- [ ] **Step 4: Render the overlay**

Add, alongside the other drawers near the end of the JSX (after `<EditProjectDrawer ... />`):

```tsx
      <LocationStepOverlay
        open={pendingAiCodes !== null}
        onResolved={handleLocationResolved}
        onSkip={handleLocationSkip}
      />
```

- [ ] **Step 5: Verify it builds**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Manual end-to-end verification**

Run: `npm run dev`, sign in, create a project via "Sugerir con IA" with a description likely to produce real SCIAN codes (e.g. product/service "Software de contabilidad para pequeños negocios", target audience "Despachos contables y contadores independientes").

Check:
- After creation, the location overlay appears (not the map directly) — on desktop as a centered modal, on mobile as a bottom sheet.
- Clicking "Compartir mi ubicación" triggers the browser's location permission prompt (if not already granted) and, on success, closes the overlay and the existing `AdvancedSearchProgress` card appears and completes with real results.
- Reloading and creating a *second* project the same way, but instead using the manual Estado + Municipio pickers and "Continuar", also closes the overlay and kicks off the same progress card.
- Creating a *third* project the same way, but clicking "Buscar solo con palabras clave por ahora" (or dismissing via Escape), lands directly on the map with only keyword results — no progress card, matching today's existing behavior.
- Creating a project via "Omitir, elegir manualmente" at the very first describe step (no AI suggestions at all) never shows the location overlay at all.

- [ ] **Step 7: Commit**

```bash
git add components/app-shell.tsx
git commit -m "Wire AI-suggested SCIAN codes to a location step and real search kickoff"
```

---

## Self-Review Notes

- **Spec coverage:** shared reverse-geocode extraction with no behavior change to `AdvancedSearchDrawer` (Task 1), `runAdvancedSearch` exposed through the ref (Task 2), `scianCodes` captured and forwarded from the AI response through to a sessionStorage hand-off (Task 3), the location overlay with GPS/manual/skip paths and dismiss-as-skip (Task 4), full wiring with the "no codes → no overlay" and "skip → land on map unchanged" behaviors preserved (Task 5), the `router.push`-remount constraint that motivated the sessionStorage design is addressed directly (Task 3) rather than glossed over.
- **Placeholder scan:** none found — every step has concrete code or a concrete manual-verification procedure.
- **Type consistency:** `ReverseGeocodedLocation`/`matchEntidadMunicipio`/`reverseGeocodeToEntidadMunicipio` (Task 1) match their usage in Task 4. `BusinessMapHandle.runAdvancedSearch(codes, entidad, municipio)` (Task 2) matches its call in Task 5. `setPendingAiSearch`/`takePendingAiSearch` (Task 3) match their usage in Task 3 itself and Task 5. `AiDescribeStepProps.onSuggested`'s new second parameter (Task 3) matches how `CreateProjectDrawer` calls it (Task 3, same task — both edited together since they're tightly coupled). `LocationStepOverlayProps` (Task 4) matches how `AppShell` renders it (Task 5).
