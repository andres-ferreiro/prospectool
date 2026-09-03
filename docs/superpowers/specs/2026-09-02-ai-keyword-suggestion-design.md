# AI-assisted keyword suggestion for project creation

## Problem

Today, creating a project ([create-project-form.tsx](../../../components/project-setup/create-project-form.tsx)) requires the user to manually pick keywords from a fixed list of ~50 quick-pick pills ([quick-picks.ts](../../../lib/scian/quick-picks.ts)) or type free text. This works but requires the user to already know which category names DENUE/SCIAN use. We want to let a user describe their product/service and their ideal client in plain language, and have the app suggest the right search keywords automatically — both as a UX improvement and as a differentiating, shareable feature for organic/social/SEO acquisition.

## Scope

In scope:
- A new "describe your business" step shown before the existing project-creation form, for **new project creation only**.
- A server-side endpoint that calls a cheap LLM (Gemini Flash) to turn that description into a handful of DENUE-style Spanish keyword phrases.
- Server-side validation of the model's suggestions against the existing SCIAN catalog before they're shown to the user, to filter out hallucinated categories.
- Graceful fallback to the existing manual keyword picker on any failure.
- Available to all users, including those on a free trial (this is a low-cost activation/conversion feature, not a premium perk).

Out of scope (explicitly deferred, not needed for MVP):
- Persisting the "product/service description" / "target audience" text anywhere in the database. These two inputs exist only to produce a keyword suggestion at creation time, then are discarded.
- Re-generating suggestions for an *existing* project (editing a project still only offers the manual keyword picker, unchanged).
- Any SCIAN exact-code selection — this feature only ever produces free-text keywords, matching how DENUE search already works today (see [catalog.ts](../../../lib/scian/catalog.ts) header comment: SCIAN clase titles double as reliable DENUE free-text search keywords).
- Location/geography input — location is chosen per-search, not per-project, and is unaffected by this feature.

## UX / Flow

`CreateProjectDrawer` gains a new first step, `AiDescribeStep`, shown before the existing `CreateProjectForm` content:

1. Two short text inputs:
   - "¿Qué producto o servicio ofreces?" (product/service)
   - "¿Quién es tu cliente ideal?" (target audience)
2. Primary action: **"Sugerir con IA"** — calls the suggestion endpoint, then advances to the existing form (Step 2) with the returned keywords pre-selected.
3. Secondary action: **"Omitir, elegir manualmente"** — skips straight to Step 2 with no keywords pre-filled, for users who don't want to use the AI step.

Step 2 (the existing `CreateProjectForm` + `KeywordPicker`) is otherwise unchanged. Suggested keywords that aren't in `QUICK_PICK_KEYWORDS` render through `KeywordPicker`'s existing mechanism for out-of-list terms (the `extra` array it already renders for legacy/free-text keywords) — no changes needed to `KeywordPicker` itself. The user can add or remove keywords freely before submitting, exactly as today.

The project's display `name` (stored as `product_service` in the `projects` table) remains a separate field on Step 2, unchanged. It is not fed by or derived from the new AI step's "product/service" input — the two are independent by design, since the AI-step description tends to be longer/more descriptive than a good display name.

## Backend

New route: `app/api/ai/suggest-keywords/route.ts`

- **Auth**: gated by `requireUser()` (same pattern as [lib/db/projects.ts](../../../lib/db/projects.ts)). This must never be reachable anonymously — it triggers a real, billed external API call, so an unauthenticated endpoint would be a cost-abuse vector even though per-call cost is very low.
- **Request body**: `{ productService: string, targetAudience: string }`.
- **Model call**: Gemini Flash (via `GEMINI_API_KEY`, using its structured/JSON output mode), given a system prompt that:
  - Includes ~15–20 example category names drawn from `QUICK_PICK_KEYWORDS` as style anchors (not the full 6,530-row catalog — too many tokens for the value it adds).
  - Asks for a JSON array of 3–6 short Spanish business-category phrases in DENUE/SCIAN vocabulary style, biased toward the described target audience (e.g. B2B/professional-services phrasing vs. consumer-retail phrasing).
- **Validation**: before returning results to the client, normalize and fuzzy-match each suggested phrase against `SCIAN_CATALOG` titles ([lib/scian/catalog.ts](../../../lib/scian/catalog.ts)). Phrases with no reasonable match are dropped — this is the guard against the model hallucinating a category that would return zero DENUE results. This matching function is pure (no I/O) and unit-testable independently of the network call.
- **Response**: `{ keywords: string[] }` (post-validation; may legitimately be shorter than what the model returned, or even empty if nothing matched).
- **Timeout**: the OpenAI call is capped (e.g. 8s). A timeout is treated the same as any other failure.

## Error handling

Any failure — network error, API error, timeout, or an empty/all-filtered result — causes the client to silently fall back to Step 2 with no keywords pre-filled (equivalent to pressing "Omitir, elegir manualmente"), plus a brief toast ("No se pudo sugerir automáticamente, elige tus categorías"). Project creation itself is never blocked by this feature failing.

No server-side retry loop — a single attempt per user action keeps cost and latency predictable. If the user wants to try again, they can go back and press "Sugerir con IA" again (a fresh, deliberate action, not automatic retries).

## Testing

- Unit tests for the catalog fuzzy-matching/validation function: given known-good and known-hallucinated model outputs, assert which phrases survive filtering.
- Manual smoke test of the full flow against the real OpenAI API in development (mocking a paid external API in automated tests isn't worth the cost/complexity for this scope).

## Cost note

At roughly one call per project creation (not per search), this comfortably fits within Gemini Flash's free tier at early-stage volume — effectively $0 cost. Even past the free tier, Flash's per-token pricing keeps this at a small fraction of a cent per project, negligible relative to the 49/399 MXN pricing being planned and not justifying a separate pricing tier.
