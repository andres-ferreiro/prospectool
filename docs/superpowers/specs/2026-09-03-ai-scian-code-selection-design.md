# AI-driven SCIAN code selection (Piece 1 of the AI onboarding project)

## Problem

The shipped AI keyword-suggestion feature ([2026-09-02-ai-keyword-suggestion-design.md](2026-09-02-ai-keyword-suggestion-design.md)) only produces free-text keywords for DENUE's substring search. Those are useful but imprecise (a keyword like "Restaurantes" matches every class containing that substring). The app's existing Advanced Search ([advanced-search-drawer.tsx](../../../components/map-view/advanced-search-drawer.tsx)) already supports precise, class-level SCIAN-code targeting — but today the user has to browse and pick codes manually.

This is Piece 1 of a larger four-piece project (AI picks codes → location step → orchestrated dual search with progress → enhanced layers pane). This piece adds only the AI capability to pick real SCIAN codes; the onboarding UI that will surface them is Piece 3, not built yet.

## Scope

In scope:
- Extend the existing suggestion call so it also returns SCIAN codes, chosen by the model from the real, complete SCIAN catalog (1,086 classes, verified against the official INEGI SCIAN 2023 revision — see Research below).
- Validate every returned code against the real catalog before it's ever returned from the API — a hallucinated code is dropped, never surfaced.
- No UI changes. The existing `/api/ai/suggest-keywords` route gains an additive `scianCodes` field; the already-shipped `AiDescribeStep` component is untouched and keeps working exactly as it does today (it only reads `.keywords`).

Out of scope (deferred to later pieces):
- Any UI that shows or uses `scianCodes` (Piece 3).
- Location acquisition (Piece 2) — this piece's Gemini call needs no location; SCIAN codes aren't location-scoped, only the eventual DENUE/SIEM search against them is.
- Kicking off any actual search (Piece 3).
- Route renaming — `/api/ai/suggest-keywords` keeps its current path for this piece, even though its job now extends beyond keywords. Revisit the name in Piece 3, alongside the UI work that actually surfaces codes to users.

## Research: is the SCIAN catalog data trustworthy?

Before committing to "let the model reason over our catalog," the catalog's own accuracy was verified:

- **Provenance:** [scripts/generate-scian-catalog.mjs](../../../scripts/generate-scian-catalog.mjs) parses the official INEGI SCIAN `.xlsx` catalog directly (raw XML row extraction from the real spreadsheet's CLASE/SUBSECTOR/SECTOR sheets) — not hand-typed, not AI-generated.
- **Structural audit:** 1,086 entries, all unique 6-digit codes, no empty titles, every class successfully mapped to a real sector and subsector (zero "Otros" fallback failures).
- **External verification:** SCIAN México 2018 has 1,084 classes; the 2023 revision has exactly **1,086** — matching this catalog precisely. The app's data is the current, correct SCIAN 2023 revision, not stale.

## Design considered and rejected: hierarchical funnel

An earlier design proposed narrowing the catalog first (pick relevant subsectors from 94 real subsector names, then pick codes only from classes within those subsectors, with a keyword-substring safety net to catch cases where the "obvious" narrowing guess is wrong). This was rejected after estimating actual token cost: the full catalog in a minimal `code|title` format is only ~62,000 characters (~15,600 tokens) — cheap enough (~$0.006/call at current Gemini Flash pricing, effectively free at this app's volume) to send in full, every time. Given that, the two-call funnel had no real advantage: it was ~3x cheaper in tokens but still financially negligible, while being strictly *less* reliable (a bad narrowing guess plus a missed safety-net match means the correct code is never even considered) and roughly double the latency (two round trips instead of one). Sending the complete catalog in a single call is simpler, faster, and can't miss a real category due to bad pre-filtering.

## Design

**Prompt (single Gemini call):** given `productService` and `targetAudience` (same two inputs the existing describe step already collects), the prompt includes:
1. The complete SCIAN catalog as `code|title` lines (one per class, ~15,600 tokens) — precomputed once at module load, not re-serialized per request.
2. The existing keyword-style examples (from `QUICK_PICK_KEYWORDS`) as a style anchor for the `keywords` output.
3. Instructions to return a JSON object: `{ "keywords": string[], "scianCodes": string[] }` — 3-6 keywords in the existing DENUE free-text style, and 3-8 SCIAN codes chosen *exclusively* from the codes listed in the prompt.

**Response parsing:** the response is now a JSON object with two array fields, not a bare array (a shape change from the currently-shipped `parseGeminiKeywords`). A missing or malformed individual field defaults to an empty array rather than rejecting the whole response — a response is only rejected outright if it has no text, isn't valid JSON, or doesn't parse to an object at all.

**Validation (two independent pure functions):**
- `keywords`: unchanged — still filtered through the existing `matchSuggestedKeywords` ([lib/scian/match-keywords.ts](../../../lib/scian/match-keywords.ts)).
- `scianCodes`: new `matchSuggestedScianCodes(suggested: string[]): string[]` in a new file, `lib/scian/match-scian-codes.ts`. Checks each suggested code against the real set of codes in `SCIAN_CATALOG` (built once as a module-level `Set`), drops anything not found (the anti-hallucination guard), deduplicates, and caps the result to 8 entries.

**Response shape:** `/api/ai/suggest-keywords` returns `{ keywords: string[], scianCodes: string[] }` — additive; the existing client only destructures `.keywords` and is unaffected.

## Error handling

Unchanged from the existing feature: any failure (network, non-2xx, timeout, unparseable response) is caught by the route and surfaced as a generic 502, logged server-side — the same behavior already shipped. No new failure modes are introduced; a response with an empty `scianCodes` array (e.g., every suggested code failed validation) is not an error, just an empty result the client already ignores in this piece.

## Testing

- Unit tests for `matchSuggestedScianCodes`: valid real codes are kept, hallucinated/non-existent codes are dropped, duplicates are removed, results are capped at 8.
- Unit tests for the updated response parser (`gemini-client.test.ts`): valid object with both arrays, one field missing/malformed (defaults to empty array, no throw), no candidates/invalid JSON/non-object response (throws, as before).
- No new manual-verification burden beyond what Task 3 of the original plan already established (this piece has no new UI to click through) — a live smoke test against the real API confirms the object shape and that at least one plausible code comes back for a representative product/audience pair.

## Cost note

At current Gemini Flash pricing (~$0.30/1M input, ~$2.50/1M output tokens), a call with the full catalog costs roughly $0.006 — a fraction of a cent, and likely covered by the free tier at this app's expected volume. Not a factor in the pricing model.
