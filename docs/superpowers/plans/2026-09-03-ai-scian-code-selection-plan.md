# AI-driven SCIAN code selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing AI keyword-suggestion call so it also returns SCIAN codes, chosen by Gemini from the complete real catalog in one call, validated against it before ever being returned — backend/API only, no UI changes.

**Architecture:** One Gemini call now returns a JSON object (`{ keywords, scianCodes }`) instead of a bare keyword array. The prompt embeds the entire 1,086-class SCIAN catalog as compact `code|title` lines. A new pure function validates returned codes against the real catalog (the same anti-hallucination pattern the existing keyword matcher already uses). The existing route gains the new field additively; the already-shipped UI is untouched.

**Tech Stack:** Same as the existing feature — Next.js route handler, Gemini REST API via `fetch`, Vitest.

## Global Constraints

- No UI changes anywhere in this plan — `components/project-setup/ai-describe-step.tsx` is not touched.
- `/api/ai/suggest-keywords` keeps its current path (not renamed in this plan).
- Every SCIAN code returned to a client MUST exist in `SCIAN_CATALOG` — never surface a hallucinated code.
- The response parser must default a missing/malformed individual field (`keywords` or `scianCodes`) to an empty array rather than rejecting the whole response; it only throws if the response has no text, isn't valid JSON, or doesn't parse to an object at all.
- `scianCodes` results are capped at 8 entries, deduplicated.

---

## File Structure

- Create `lib/scian/match-scian-codes.ts` — pure function validating suggested codes against the real catalog.
- Create `lib/scian/match-scian-codes.test.ts` — unit tests for the above.
- Modify `lib/ai/gemini-client.ts` — new prompt embedding the full catalog, new object-shaped response parser, renamed/reshaped call function.
- Modify `lib/ai/gemini-client.test.ts` — replace the old bare-array parser tests with tests for the new object-shaped parser.
- Modify `app/api/ai/suggest-keywords/route.ts` — call the new function, validate both outputs, return both fields.

---

### Task 1: SCIAN code validation guard

**Files:**
- Create: `lib/scian/match-scian-codes.ts`
- Test: `lib/scian/match-scian-codes.test.ts`

**Interfaces:**
- Produces: `matchSuggestedScianCodes(suggested: string[]): string[]` — exported from `lib/scian/match-scian-codes.ts`.

- [ ] **Step 1: Write the failing test**

Create `lib/scian/match-scian-codes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { matchSuggestedScianCodes } from "./match-scian-codes";

// All real codes, verified present in lib/scian/catalog.ts.
const REAL_CODES = [
  "722511", // Restaurantes con servicio de preparación de alimentos a la carta o de comida corrida
  "722512", // Restaurantes con servicio de preparación de pescados y mariscos
  "722513", // Restaurantes con servicio de preparación de antojitos
  "722514", // Restaurantes con servicio de preparación de tacos y tortas
  "722516", // Restaurantes de autoservicio
  "541941", // Servicios veterinarios para mascotas prestados por el sector privado
  "111110", // Cultivo de soya
  "461110", // Comercio al por menor en tiendas de abarrotes, ultramarinos y misceláneas
  "621111", // Consultorios de medicina general del sector privado
  "812110", // Salones y clínicas de belleza y peluquerías
];

describe("matchSuggestedScianCodes", () => {
  it("keeps codes that exist in the real catalog", () => {
    const result = matchSuggestedScianCodes(["722511", "541941"]);
    expect(result).toEqual(["722511", "541941"]);
  });

  it("drops codes that don't exist in the catalog", () => {
    const result = matchSuggestedScianCodes(["722511", "999999", "541941"]);
    expect(result).toEqual(["722511", "541941"]);
  });

  it("deduplicates repeated codes", () => {
    const result = matchSuggestedScianCodes(["722511", "722511", "541941"]);
    expect(result).toEqual(["722511", "541941"]);
  });

  it("caps the result at 8 entries", () => {
    const result = matchSuggestedScianCodes(REAL_CODES);
    expect(result).toHaveLength(8);
    expect(result).toEqual(REAL_CODES.slice(0, 8));
  });

  it("returns an empty array for an empty input", () => {
    expect(matchSuggestedScianCodes([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- lib/scian/match-scian-codes.test.ts`
Expected: FAIL — `match-scian-codes.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

Create `lib/scian/match-scian-codes.ts`:

```ts
import { SCIAN_CATALOG } from "./catalog";

const VALID_CODES = new Set(SCIAN_CATALOG.map((entry) => entry.code));
const MAX_CODES = 8;

// Filters a model's suggested SCIAN codes down to ones that actually exist
// in the real catalog — a hard guard against the model hallucinating a
// code, since these feed Advanced Search's precise class-level query
// rather than DENUE's forgiving free-text search (unlike keyword
// suggestions, there's no "close enough" here: a wrong code returns
// results for the wrong business entirely).
export function matchSuggestedScianCodes(suggested: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const code of suggested) {
    if (!VALID_CODES.has(code)) continue;
    if (seen.has(code)) continue;
    seen.add(code);
    result.push(code);
    if (result.length >= MAX_CODES) break;
  }
  return result;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- lib/scian/match-scian-codes.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/scian/match-scian-codes.ts lib/scian/match-scian-codes.test.ts
git commit -m "Add SCIAN code validation guard"
```

---

### Task 2: Gemini client — full-catalog prompt and object-shaped response

**Files:**
- Modify: `lib/ai/gemini-client.ts`
- Modify: `lib/ai/gemini-client.test.ts`

**Interfaces:**
- Consumes: `matchSuggestedScianCodes` is NOT used here (that's Task 3's job) — this task only produces raw, unvalidated suggestions.
- Produces:
  - `interface SuggestSearchTargetsInput { productService: string; targetAudience: string }` (renamed from `SuggestKeywordsInput`)
  - `interface GeminiSuggestions { keywords: string[]; scianCodes: string[] }`
  - `parseGeminiSuggestions(data: unknown): GeminiSuggestions` — pure, exported for testing (replaces `parseGeminiKeywords`)
  - `suggestSearchTargetsFromGemini(input: SuggestSearchTargetsInput): Promise<GeminiSuggestions>` (replaces `suggestKeywordsFromGemini`) — used by Task 3's route.

- [ ] **Step 1: Write the failing tests**

Replace the entire contents of `lib/ai/gemini-client.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseGeminiSuggestions } from "./gemini-client";

function geminiResponse(text: string) {
  return { candidates: [{ content: { parts: [{ text }] } }] };
}

describe("parseGeminiSuggestions", () => {
  it("parses a valid object with both keywords and scianCodes", () => {
    const result = parseGeminiSuggestions(
      geminiResponse('{"keywords": ["restaurantes", "cafeterías"], "scianCodes": ["722511", "722512"]}')
    );
    expect(result).toEqual({
      keywords: ["restaurantes", "cafeterías"],
      scianCodes: ["722511", "722512"],
    });
  });

  it("drops non-string entries from each array", () => {
    const result = parseGeminiSuggestions(
      geminiResponse('{"keywords": ["restaurantes", 5, null], "scianCodes": ["722511", 42]}')
    );
    expect(result).toEqual({ keywords: ["restaurantes"], scianCodes: ["722511"] });
  });

  it("defaults a missing field to an empty array instead of throwing", () => {
    const result = parseGeminiSuggestions(geminiResponse('{"keywords": ["restaurantes"]}'));
    expect(result).toEqual({ keywords: ["restaurantes"], scianCodes: [] });
  });

  it("returns both fields empty when the object has neither key", () => {
    const result = parseGeminiSuggestions(geminiResponse("{}"));
    expect(result).toEqual({ keywords: [], scianCodes: [] });
  });

  it("throws if the response has no candidates", () => {
    expect(() => parseGeminiSuggestions({ candidates: [] })).toThrow();
  });

  it("throws if the text is not valid JSON", () => {
    expect(() => parseGeminiSuggestions(geminiResponse("not json"))).toThrow();
  });

  it("throws if the parsed JSON is an array, not an object", () => {
    expect(() => parseGeminiSuggestions(geminiResponse('["restaurantes"]'))).toThrow();
  });

  it("throws if the parsed JSON is null", () => {
    expect(() => parseGeminiSuggestions(geminiResponse("null"))).toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- lib/ai/gemini-client.test.ts`
Expected: FAIL — `parseGeminiSuggestions` does not exist yet (`parseGeminiKeywords` is still the old export).

- [ ] **Step 3: Write the implementation**

Replace the entire contents of `lib/ai/gemini-client.ts`:

```ts
import { QUICK_PICK_KEYWORDS } from "@/lib/scian/quick-picks";
import { SCIAN_CATALOG } from "@/lib/scian/catalog";

// "-latest" alias rather than a dated model id, so this keeps working as
// Google retires/renames specific model versions over time.
const GEMINI_MODEL = "gemini-flash-latest";
// A real call typically finishes in ~2-3s, but the first request in a
// session and general API latency variance can run well past 8s — a
// cap that tight was causing spurious timeouts on otherwise-successful
// requests, so this leaves more headroom before falling back.
const GEMINI_TIMEOUT_MS = 15000;
// Anchors the model's output style for the "keywords" field without
// spending tokens re-deriving it — a handful of examples is enough to
// convey "short business-category phrase" as the expected shape.
const PROMPT_EXAMPLES = QUICK_PICK_KEYWORDS.slice(0, 18).join(", ");
// The complete catalog as compact "code|title" lines, computed once at
// module load rather than per-request — ~1,086 lines, ~15,600 tokens.
// Sending the full catalog (verified against the real INEGI SCIAN 2023
// revision — see the design doc) means the model can only choose codes
// that genuinely exist, and can't miss a category due to some narrower
// pre-filtering step guessing wrong.
const CATALOG_LINES = SCIAN_CATALOG.map((entry) => `${entry.code}|${entry.title}`).join("\n");

export interface SuggestSearchTargetsInput {
  productService: string;
  targetAudience: string;
}

export interface GeminiSuggestions {
  keywords: string[];
  scianCodes: string[];
}

function buildPrompt({ productService, targetAudience }: SuggestSearchTargetsInput): string {
  return `Eres un asistente que ayuda a negocios en México a identificar qué tipo de negocios buscar como clientes potenciales, usando el catálogo oficial SCIAN (INEGI).

Catálogo SCIAN completo (código|título), un renglón por clase:
${CATALOG_LINES}

Ejemplos de categorías de negocio válidas para "keywords": ${PROMPT_EXAMPLES}.

Producto o servicio del usuario: "${productService}"
Cliente ideal del usuario: "${targetAudience}"

Devuelve un objeto JSON con dos campos:
- "keywords": arreglo de 3 a 6 frases cortas en español (mismo estilo que los ejemplos) que el usuario debería buscar como palabra clave libre.
- "scianCodes": arreglo de 3 a 8 códigos SCIAN de 6 dígitos, elegidos EXCLUSIVAMENTE de los códigos listados arriba, que mejor representen el tipo de negocio de ese cliente ideal.

Responde SOLO con el objeto JSON, sin texto adicional.`;
}

function extractStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

// Pure — extracts and validates the suggestions object from Gemini's
// response shape, independent of the network call so it's unit-testable
// without mocking fetch. A missing or malformed individual field (e.g. the
// model omits "scianCodes") defaults to an empty array rather than
// rejecting the whole response — only a missing/unparseable/non-object
// response is treated as an error.
export function parseGeminiSuggestions(data: unknown): GeminiSuggestions {
  const response = data as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini no devolvió contenido");

  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Gemini no devolvió un objeto");
  }

  const obj = parsed as Record<string, unknown>;
  return {
    keywords: extractStringArray(obj.keywords),
    scianCodes: extractStringArray(obj.scianCodes),
  };
}

export async function suggestSearchTargetsFromGemini(
  input: SuggestSearchTargetsInput
): Promise<GeminiSuggestions> {
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
    return parseGeminiSuggestions(data);
  } finally {
    clearTimeout(timeout);
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- lib/ai/gemini-client.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/ai/gemini-client.ts lib/ai/gemini-client.test.ts
git commit -m "Embed full SCIAN catalog in Gemini prompt, return codes + keywords"
```

---

### Task 3: Wire the route to the new function and validate both outputs

**Files:**
- Modify: `app/api/ai/suggest-keywords/route.ts`

**Interfaces:**
- Consumes: `suggestSearchTargetsFromGemini` + `SuggestSearchTargetsInput` (from Task 2), `matchSuggestedKeywords` (existing, unchanged), `matchSuggestedScianCodes` (from Task 1).
- Produces: `POST /api/ai/suggest-keywords` now returns `{ keywords: string[], scianCodes: string[] }` on success (previously just `{ keywords: string[] }`) — additive, existing client (`ai-describe-step.tsx`) only reads `.keywords` and is unaffected.

- [ ] **Step 1: Update the route**

Replace the entire contents of `app/api/ai/suggest-keywords/route.ts`:

```ts
import { requireUser } from "@/lib/supabase/current-user";
import { suggestSearchTargetsFromGemini } from "@/lib/ai/gemini-client";
import { matchSuggestedKeywords } from "@/lib/scian/match-keywords";
import { matchSuggestedScianCodes } from "@/lib/scian/match-scian-codes";

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
    const suggestions = await suggestSearchTargetsFromGemini({ productService, targetAudience });
    const keywords = matchSuggestedKeywords(suggestions.keywords);
    const scianCodes = matchSuggestedScianCodes(suggestions.scianCodes);
    return Response.json({ keywords, scianCodes });
  } catch (err) {
    console.error("[suggest-keywords]", err);
    return Response.json({ error: "No se pudieron sugerir categorías" }, { status: 502 });
  }
}
```

- [ ] **Step 2: Verify it builds**

Run: `npx tsc --noEmit`
Expected: no new type errors (in particular, confirm nothing else in the codebase still imports the now-removed `suggestKeywordsFromGemini` / `SuggestKeywordsInput` / `parseGeminiKeywords` names — a repo-wide search should turn up nothing outside this route and the files Task 2 already updated).

- [ ] **Step 3: Live smoke verification (real API, no auth needed)**

This route needs a real authenticated session to exercise end-to-end, which isn't available in this environment — but `GEMINI_API_KEY` **is** configured in `.env.local` in this environment, so the underlying Gemini call can be verified directly, bypassing the route/auth layer. Write a throwaway script (do not commit it), run it, then delete it:

Create a temporary file, e.g. `/tmp/verify-scian-suggestions.mjs`:

```js
process.env.GEMINI_API_KEY = /* read the real value out of .env.local in this repo — do not hardcode or print it */;
const { suggestSearchTargetsFromGemini } = await import("<absolute path to lib/ai/gemini-client.ts, compiled via tsx or similar — see note below>");
```

Practically: the simplest reliable way to run this is with `npx tsx` (or `npx vite-node`) pointed at a small script that imports `suggestSearchTargetsFromGemini` from `./lib/ai/gemini-client.ts` (relative to the repo root), reads `GEMINI_API_KEY` from `.env.local` into `process.env` first (e.g. via `dotenv` or a manual `readFileSync`/parse — check what's already available in `devDependencies`/`node_modules` before adding anything new), and calls it with a representative `{ productService: "Software de contabilidad para pequeños negocios", targetAudience: "Despachos contables y contadores independientes" }`, logging the result.

Expected: a `{ keywords: [...], scianCodes: [...] }` result with a handful of plausible entries in each (e.g. `scianCodes` including something in the accounting/professional-services space). Confirm every code in the returned `scianCodes` actually appears in `lib/scian/catalog.ts` (spot-check 2-3 by grepping the file) — this is the live proof that the full-catalog prompt actually works, not just the offline validation logic.

Delete the temporary script when done; it must not be committed.

- [ ] **Step 4: Commit**

```bash
git add app/api/ai/suggest-keywords/route.ts
git commit -m "Return validated SCIAN codes alongside keywords from suggest-keywords route"
```

---

## Self-Review Notes

- **Spec coverage:** full-catalog prompt (Task 2), object-shaped response with keywords+scianCodes (Task 2), code validation against real catalog (Task 1), route returns both validated fields additively (Task 3), no UI changes (confirmed — no task touches any `.tsx` file), route path unchanged (confirmed — Task 3 modifies the existing file in place, no rename), missing-field-defaults-to-empty-array parsing behavior (Task 2, tested), 8-code cap and dedup (Task 1, tested), live verification that the real catalog data round-trips correctly through a real model call (Task 3).
- **Placeholder scan:** Task 3 Step 3's live-verification instructions are necessarily less prescriptive than a normal TDD step (there's no fixed script to paste verbatim, since the exact tool available — tsx, vite-node, ts-node — isn't known in advance), but the goal, inputs, and pass/fail criteria are concrete and unambiguous; this is a manual-verification procedure, not an implementation step, so the same code-block rigor doesn't apply. No other placeholders found.
- **Type consistency:** `matchSuggestedScianCodes(suggested: string[]): string[]` (Task 1) matches its usage in Task 3. `GeminiSuggestions`, `SuggestSearchTargetsInput`, and `suggestSearchTargetsFromGemini` (Task 2) match their usage in Task 3 exactly (field names `keywords`/`scianCodes` consistent throughout).
