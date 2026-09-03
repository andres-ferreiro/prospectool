# AI-assisted keyword suggestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user describe their product/service and ideal client in plain Spanish and have the app suggest DENUE-style search keywords automatically, before falling into the existing manual keyword picker.

**Architecture:** A new first step in the project-creation drawer collects two short text inputs and posts them to a new auth-gated API route. That route calls Gemini Flash for raw keyword suggestions, filters them through a pure catalog-matching function to drop hallucinated categories, and returns the survivors. The client pre-fills those into the existing `KeywordPicker` step. Any failure at any point falls back to the existing manual flow with no new keywords pre-filled.

**Tech Stack:** Next.js route handlers, Gemini API (`gemini-2.0-flash`, `generateContent` REST endpoint) via plain `fetch`, Vitest for unit tests (new dev dependency — this repo has no test runner yet).

## Global Constraints

- The suggestion endpoint MUST be gated by `requireUser()` — never reachable anonymously (spec: cost-abuse vector).
- The Gemini call MUST time out (8000ms) and any failure (network, non-2xx, timeout, empty/unparseable output) MUST be treated as "no suggestions" — never blocks or crashes project creation.
- The two new inputs (product/service description, target audience) are NOT persisted anywhere — they exist only to produce a keyword suggestion at creation time (spec: out of scope to store them).
- This feature is available to every user, including trial users — no plan/gating check is added anywhere in this plan.
- Provider-specific code (prompt building, Gemini request/response shape) stays isolated inside `lib/ai/gemini-client.ts` so swapping providers later doesn't touch the route or UI.
- All user-facing copy is Spanish, matching the existing tone in `create-project-form.tsx` / `keyword-picker.tsx` (informal "tú" register, sentence case).

---

## File Structure

- Create `lib/scian/match-keywords.ts` — pure function that filters a list of suggested phrases down to ones that plausibly match a real SCIAN category.
- Create `lib/scian/match-keywords.test.ts` — unit tests for the above.
- Create `lib/ai/gemini-client.ts` — builds the prompt, calls Gemini's REST API, parses the response into a raw string array.
- Create `lib/ai/gemini-client.test.ts` — unit tests for the pure response-parsing logic only (no real network call).
- Create `app/api/ai/suggest-keywords/route.ts` — auth-gated POST route wiring the two above together.
- Create `components/project-setup/ai-describe-step.tsx` — the new first step's UI.
- Modify `components/project-setup/create-project-drawer.tsx` — add a two-step state machine (`"describe" | "form"`).
- Modify `components/project-setup/create-project-form.tsx` — accept an `initialKeywords` prop to pre-fill the keyword state.
- Modify `.env.local.example` — document `GEMINI_API_KEY`.
- Modify `package.json` — add `vitest` dev dependency and a `test` script.
- Create `vitest.config.ts` — minimal config resolving the existing `@/*` path alias.

---

### Task 1: Test runner setup + keyword-catalog matching function

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`
- Create: `lib/scian/match-keywords.ts`
- Test: `lib/scian/match-keywords.test.ts`

**Interfaces:**
- Produces: `matchSuggestedKeywords(suggested: string[]): string[]` — exported from `lib/scian/match-keywords.ts`. Takes raw model output, returns only the phrases that plausibly match a title in `SCIAN_CATALOG` (from `lib/scian/catalog.ts`).

- [ ] **Step 1: Install Vitest and add the test script**

Run:
```bash
npm install -D vitest
```

Modify `package.json` — add a `"test"` script next to the existing ones:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run"
  },
```

- [ ] **Step 2: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
  },
});
```

This mirrors the `"@/*": ["./*"]` alias already in `tsconfig.json` so test files can `import "@/lib/..."` exactly like app code does.

- [ ] **Step 3: Write the failing test**

Create `lib/scian/match-keywords.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { matchSuggestedKeywords } from "./match-keywords";

describe("matchSuggestedKeywords", () => {
  it("keeps phrases that match a real SCIAN category", () => {
    const result = matchSuggestedKeywords(["veterinarias", "bufetes jurídicos", "consultorios dentales"]);
    expect(result).toEqual(["veterinarias", "bufetes jurídicos", "consultorios dentales"]);
  });

  it("drops phrases with no resemblance to any SCIAN category", () => {
    const result = matchSuggestedKeywords(["servicios de teletransportación interdimensional"]);
    expect(result).toEqual([]);
  });

  it("filters a mixed list, keeping order of the survivors", () => {
    const result = matchSuggestedKeywords([
      "restaurantes",
      "servicios de teletransportación interdimensional",
      "farmacias",
    ]);
    expect(result).toEqual(["restaurantes", "farmacias"]);
  });

  it("returns an empty array for an empty input", () => {
    expect(matchSuggestedKeywords([])).toEqual([]);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- lib/scian/match-keywords.test.ts`
Expected: FAIL — `match-keywords.ts` does not exist yet (module not found).

- [ ] **Step 5: Write the implementation**

Create `lib/scian/match-keywords.ts`:

```ts
import { SCIAN_CATALOG } from "./catalog";

// Strips accents/case so "jurídicos" and "veterinarias" compare cleanly
// against catalog titles that use full, differently-inflected Spanish.
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Words shorter than this are too generic ("de", "para", "sector") to be
// useful signals for a match.
const MIN_WORD_LENGTH = 4;
// Comparing word prefixes rather than whole words tolerates Spanish
// gender/number inflection ("veterinarias" vs. catalog's "veterinarios")
// without needing a real stemmer for this filtering guard.
const PREFIX_LENGTH = 6;

function significantWordPrefixes(phrase: string): string[] {
  return normalize(phrase)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= MIN_WORD_LENGTH)
    .map((word) => word.slice(0, PREFIX_LENGTH));
}

const CATALOG_TITLES_NORMALIZED = SCIAN_CATALOG.map((entry) => normalize(entry.title));

// Filters a model's suggested keyword phrases down to the ones that
// plausibly correspond to a real SCIAN category — a guard against the
// model hallucinating a business type that would return zero DENUE
// results. Deliberately lenient (substring-of-title on word prefixes)
// rather than an exact match, since suggested phrases are meant to be
// short DENUE-style search terms, not verbatim catalog titles.
export function matchSuggestedKeywords(suggested: string[]): string[] {
  return suggested.filter((phrase) => {
    const prefixes = significantWordPrefixes(phrase);
    if (prefixes.length === 0) return false;
    return CATALOG_TITLES_NORMALIZED.some((title) =>
      prefixes.some((prefix) => title.includes(prefix))
    );
  });
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- lib/scian/match-keywords.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts package.json package-lock.json lib/scian/match-keywords.ts lib/scian/match-keywords.test.ts
git commit -m "Add SCIAN catalog keyword-matching guard with Vitest setup"
```

---

### Task 2: Gemini client (prompt building + response parsing)

**Files:**
- Create: `lib/ai/gemini-client.ts`
- Test: `lib/ai/gemini-client.test.ts`

**Interfaces:**
- Consumes: `QUICK_PICK_KEYWORDS` (from `lib/scian/quick-picks.ts`).
- Produces:
  - `interface SuggestKeywordsInput { productService: string; targetAudience: string }`
  - `parseGeminiKeywords(data: unknown): string[]` — pure, exported for testing. Throws `Error` if the shape is unrecognized.
  - `suggestKeywordsFromGemini(input: SuggestKeywordsInput): Promise<string[]>` — calls the network, used by Task 3's route. Returns the raw (unfiltered) list the model produced.

- [ ] **Step 1: Write the failing test for the pure parsing logic**

Create `lib/ai/gemini-client.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseGeminiKeywords } from "./gemini-client";

function geminiResponse(text: string) {
  return { candidates: [{ content: { parts: [{ text }] } }] };
}

describe("parseGeminiKeywords", () => {
  it("parses a valid JSON array of strings from the response text", () => {
    const result = parseGeminiKeywords(geminiResponse('["restaurantes", "cafeterías"]'));
    expect(result).toEqual(["restaurantes", "cafeterías"]);
  });

  it("drops non-string entries from the array", () => {
    const result = parseGeminiKeywords(geminiResponse('["restaurantes", 5, null]'));
    expect(result).toEqual(["restaurantes"]);
  });

  it("throws if the response has no candidates", () => {
    expect(() => parseGeminiKeywords({ candidates: [] })).toThrow();
  });

  it("throws if the text is not valid JSON", () => {
    expect(() => parseGeminiKeywords(geminiResponse("not json"))).toThrow();
  });

  it("throws if the parsed JSON is not an array", () => {
    expect(() => parseGeminiKeywords(geminiResponse('{"foo": "bar"}'))).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- lib/ai/gemini-client.test.ts`
Expected: FAIL — `gemini-client.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

Create `lib/ai/gemini-client.ts`:

```ts
import { QUICK_PICK_KEYWORDS } from "@/lib/scian/quick-picks";

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_TIMEOUT_MS = 8000;
// Anchors the model's output style without spending tokens on the full
// 6,530-row catalog — a handful of examples is enough to convey "short
// business-category phrase" as the expected shape.
const PROMPT_EXAMPLES = QUICK_PICK_KEYWORDS.slice(0, 18).join(", ");

export interface SuggestKeywordsInput {
  productService: string;
  targetAudience: string;
}

function buildPrompt({ productService, targetAudience }: SuggestKeywordsInput): string {
  return `Eres un asistente que ayuda a negocios en México a identificar qué tipo de negocios buscar como clientes potenciales.

Ejemplos de categorías de negocio válidas: ${PROMPT_EXAMPLES}.

Producto o servicio del usuario: "${productService}"
Cliente ideal del usuario: "${targetAudience}"

Devuelve un arreglo JSON de 3 a 6 frases cortas en español que describan tipos de negocio que el usuario debería buscar para encontrar a ese cliente ideal, usando el mismo estilo que los ejemplos (nombres de categorías de negocio, no oraciones completas). Responde SOLO con el arreglo JSON, sin texto adicional.`;
}

// Pure — extracts and validates the keyword array from Gemini's response
// shape, independent of the network call so it's unit-testable without
// mocking fetch.
export function parseGeminiKeywords(data: unknown): string[] {
  const response = data as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini no devolvió contenido");

  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("Gemini no devolvió un arreglo");

  return parsed.filter((item): item is string => typeof item === "string");
}

export async function suggestKeywordsFromGemini(input: SuggestKeywordsInput): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no está configurado");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(input) }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`Gemini respondió con estado ${res.status}`);
    }

    const data = await res.json();
    return parseGeminiKeywords(data);
  } finally {
    clearTimeout(timeout);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- lib/ai/gemini-client.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/ai/gemini-client.ts lib/ai/gemini-client.test.ts
git commit -m "Add Gemini client for keyword suggestion"
```

---

### Task 3: API route

**Files:**
- Create: `app/api/ai/suggest-keywords/route.ts`
- Modify: `.env.local.example`

**Interfaces:**
- Consumes: `requireUser()` (from `@/lib/supabase/current-user`), `suggestKeywordsFromGemini` + `SuggestKeywordsInput` (from `@/lib/ai/gemini-client`), `matchSuggestedKeywords` (from `@/lib/scian/match-keywords`).
- Produces: `POST /api/ai/suggest-keywords` — request body `{ productService: string, targetAudience: string }`, success response `{ keywords: string[] }` (200), error response `{ error: string }` (400 for missing input, 502 for any Gemini/network failure).

- [ ] **Step 1: Document the new env var**

Modify `.env.local.example`, appending:

```
# Gemini API key — server-only, used for AI-assisted keyword suggestion
# during project creation. https://aistudio.google.com/apikey
GEMINI_API_KEY=
```

- [ ] **Step 2: Write the route**

Create `app/api/ai/suggest-keywords/route.ts`:

```ts
import { requireUser } from "@/lib/supabase/current-user";
import { suggestKeywordsFromGemini } from "@/lib/ai/gemini-client";
import { matchSuggestedKeywords } from "@/lib/scian/match-keywords";

export async function POST(request: Request) {
  await requireUser();

  const body = await request.json();
  const productService = typeof body.productService === "string" ? body.productService.trim() : "";
  const targetAudience = typeof body.targetAudience === "string" ? body.targetAudience.trim() : "";

  if (!productService || !targetAudience) {
    return Response.json(
      { error: "Falta describir tu producto/servicio y tu cliente ideal" },
      { status: 400 }
    );
  }

  try {
    const suggested = await suggestKeywordsFromGemini({ productService, targetAudience });
    const keywords = matchSuggestedKeywords(suggested);
    return Response.json({ keywords });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado al sugerir categorías";
    return Response.json({ error: message }, { status: 502 });
  }
}
```

This follows the same body-parsing/validation style as the existing `app/api/projects/route.ts` — auth failures propagate the same way `createProject`'s internal `requireUser()` call already does elsewhere in this codebase (an unhandled throw becomes a 500), so this route doesn't special-case that.

- [ ] **Step 3: Manual verification**

This route depends on a real Gemini API key and a real authenticated session, so it isn't covered by an automated test — verify manually once `GEMINI_API_KEY` is set in `.env.local`:

Run: `npm run dev`, sign in, then from the browser console on the app's origin (so the session cookie is sent):

```js
fetch("/api/ai/suggest-keywords", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productService: "Software de contabilidad para pequeños negocios",
    targetAudience: "Despachos contables y contadores independientes",
  }),
}).then((r) => r.json()).then(console.log);
```

Expected: `{ keywords: [...] }` with a handful of Spanish business-category phrases (e.g. including something like "despachos contables"). Confirm the request fails with 400 when either field is blank, and returns quickly with a 502 if you temporarily rename `GEMINI_API_KEY` in `.env.local` to simulate it being unset.

- [ ] **Step 4: Commit**

```bash
git add app/api/ai/suggest-keywords/route.ts .env.local.example
git commit -m "Add auth-gated API route for AI keyword suggestion"
```

---

### Task 4: `AiDescribeStep` component

**Files:**
- Create: `components/project-setup/ai-describe-step.tsx`

**Interfaces:**
- Consumes: `Button` (`@/components/ui/button`), `Label` (`@/components/ui/label`), `Textarea` (`@/components/ui/textarea`), `toast` (`@/lib/toast`).
- Produces: `AiDescribeStep({ onSuggested: (keywords: string[]) => void; onSkip: () => void })` — a React component. Calls `onSuggested` with a non-empty keyword list on success, calls `onSkip` on explicit skip, on a suggestion call that returns zero keywords, or on any failure.

- [ ] **Step 1: Write the component**

Create `components/project-setup/ai-describe-step.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";

interface AiDescribeStepProps {
  onSuggested: (keywords: string[]) => void;
  onSkip: () => void;
}

export function AiDescribeStep({ onSuggested, onSkip }: AiDescribeStepProps) {
  const [productService, setProductService] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = productService.trim().length > 0 && targetAudience.trim().length > 0 && !loading;

  const handleSuggest = async () => {
    if (!canSubmit) return;
    setLoading(true);

    try {
      const res = await fetch("/api/ai/suggest-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productService, targetAudience }),
      });

      if (!res.ok) throw new Error("request failed");

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
    } catch {
      toast({
        title: "No se pudo sugerir automáticamente",
        description: "Elige tus categorías manualmente",
        variant: "error",
      });
      onSkip();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <div className="space-y-2">
        <Label htmlFor="ai-product-service" className="text-foreground/70">
          ¿Qué producto o servicio ofreces?
        </Label>
        <Textarea
          id="ai-product-service"
          placeholder="Ej. Software de contabilidad para pequeños negocios"
          value={productService}
          onChange={(e) => setProductService(e.target.value)}
          rows={2}
          className="rounded-xl border-0 px-4 py-3 shadow-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ai-target-audience" className="text-foreground/70">
          ¿Quién es tu cliente ideal?
        </Label>
        <Textarea
          id="ai-target-audience"
          placeholder="Ej. Despachos contables y contadores independientes"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          rows={2}
          className="rounded-xl border-0 px-4 py-3 shadow-sm"
        />
      </div>

      <Button size="lg" className="w-full" onClick={handleSuggest} disabled={!canSubmit}>
        {loading ? "Sugiriendo…" : "Sugerir con IA"}
      </Button>
      <button
        type="button"
        onClick={onSkip}
        className="text-center text-sm text-foreground/50 underline-offset-2 hover:underline"
      >
        Omitir, elegir manualmente
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `npx tsc --noEmit`
Expected: no new type errors introduced by this file.

- [ ] **Step 3: Commit**

```bash
git add components/project-setup/ai-describe-step.tsx
git commit -m "Add AiDescribeStep component"
```

---

### Task 5: Wire the new step into project creation

**Files:**
- Modify: `components/project-setup/create-project-drawer.tsx`
- Modify: `components/project-setup/create-project-form.tsx`

**Interfaces:**
- Consumes: `AiDescribeStep` (Task 4).
- Produces: `CreateProjectForm` gains an optional `initialKeywords?: string[]` prop (defaults to `[]`), used only to seed its internal keyword state at mount.

- [ ] **Step 1: Add the `initialKeywords` prop to `CreateProjectForm`**

Modify `components/project-setup/create-project-form.tsx` — change the props interface and the `keywords` state initializer:

```ts
interface CreateProjectFormProps {
  onCreated: (project: ProjectRow) => void;
  initialKeywords?: string[];
}

export function CreateProjectForm({ onCreated, initialKeywords = [] }: CreateProjectFormProps) {
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState<string[]>(initialKeywords);
```

(Everything else in this file is unchanged.)

- [ ] **Step 2: Add the two-step state machine to `CreateProjectDrawer`**

Modify `components/project-setup/create-project-drawer.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { AiDescribeStep } from "./ai-describe-step";
import { CreateProjectForm } from "./create-project-form";
import { useIsDesktop } from "@/hooks/use-media-query";
import type { ProjectRow } from "@/lib/db/types";

interface CreateProjectDrawerProps {
  open: boolean;
  dismissible: boolean;
  onClose: () => void;
  onCreated: (project: ProjectRow) => void;
}

export function CreateProjectDrawer({
  open,
  dismissible,
  onClose,
  onCreated,
}: CreateProjectDrawerProps) {
  const isDesktop = useIsDesktop();
  const [step, setStep] = useState<"describe" | "form">("describe");
  const [initialKeywords, setInitialKeywords] = useState<string[]>([]);

  const resetSteps = () => {
    setStep("describe");
    setInitialKeywords([]);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next && dismissible) {
          onClose();
          resetSteps();
        }
      }}
      disablePointerDismissal={!dismissible}
      showSwipeHandle={dismissible && !isDesktop}
      swipeDirection={isDesktop ? "right" : "down"}
    >
      <DrawerContent floating={isDesktop} className="bg-sheet">
        <DrawerHeader>
          <DrawerTitle>Nuevo proyecto</DrawerTitle>
        </DrawerHeader>
        {step === "describe" ? (
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
        )}
      </DrawerContent>
    </Drawer>
  );
}
```

`CreateProjectForm` remounts fresh each time the drawer switches from `"describe"` to `"form"` (it's a different component type in the tree), so `useState(initialKeywords)` in Task 5 Step 1 picks up the passed-in value correctly on that mount — no stale-closure concern.

- [ ] **Step 3: Verify it builds**

Run: `npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 4: Manual end-to-end verification**

Run: `npm run dev`, open the app, sign in, click "Nuevo proyecto".

Check:
- The describe step appears first, with both text fields empty and "Sugerir con IA" disabled until both are filled.
- Filling both fields and clicking "Sugerir con IA" advances to the existing form with suggested keywords already selected as pills.
- "Omitir, elegir manualmente" advances to the existing form with no keywords selected.
- Closing and reopening the drawer (or completing a project creation) resets back to the describe step.
- Suggested keywords can still be removed, and quick-pick pills can still be added, before submitting — exactly as the form worked before this change.

- [ ] **Step 5: Commit**

```bash
git add components/project-setup/create-project-drawer.tsx components/project-setup/create-project-form.tsx
git commit -m "Wire AI keyword suggestion into project creation flow"
```

---

## Self-Review Notes

- **Spec coverage:** describe-step UI (Task 4/5), two-input flow (Task 4), Gemini call (Task 2), catalog validation guard (Task 1), auth-gated route (Task 3), silent fallback on any failure (Task 4/5), no persistence of the two new inputs (confirmed — neither field is ever sent anywhere but the suggestion route, and `CreateProjectForm`'s existing submit body is unchanged), available to all users/no gating added (confirmed — no plan/tier check appears anywhere in this plan), unit tests for the pure validation and parsing logic (Tasks 1 and 2), manual smoke test for the full network path (Task 3 Step 3, Task 5 Step 4).
- **Placeholder scan:** none found — every step has real code or a concrete manual-verification procedure.
- **Type consistency:** `matchSuggestedKeywords(suggested: string[]): string[]` (Task 1) is the exact signature imported in Task 3's route. `SuggestKeywordsInput` and `suggestKeywordsFromGemini` (Task 2) match their usage in Task 3. `AiDescribeStepProps` (Task 4) matches how `CreateProjectDrawer` calls it in Task 5. `CreateProjectForm`'s new `initialKeywords` prop (Task 5) matches how `CreateProjectDrawer` passes it.
