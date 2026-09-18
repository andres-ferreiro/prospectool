// PGRST303 ("JWT issued at future") is a known Supabase-side bug, not a
// problem with the token or a local clock: PostgREST caches its notion of
// "now" instead of reading the system clock per request, and that cache
// occasionally lags a moment behind real time — so a token issued right
// now can briefly look like it's from the future and get rejected.
// See https://github.com/orgs/supabase/discussions/48123.
//
// It's a momentary race, not a real auth failure — retrying a beat later
// succeeds once the cache catches up, so every query in lib/db/ routes
// through this instead of surfacing the error to the user. It shows up
// most right after a session refresh (a PWA reopened after the access
// token expired), where the fresh token is used within the same second.
const JWT_ISSUED_AT_FUTURE = "PGRST303";

// Backoff before each retry. Two attempts spanning ~1.2s comfortably
// outlast PostgREST's cached clock, which lags by well under a second.
const RETRY_DELAYS_MS = [400, 800];

interface QueryResult<T> {
  data: T;
  error: { message: string; code?: string } | null;
}

// Supabase query builders (PostgrestBuilder and friends) expose
// abortSignal(); anything else is still accepted and just retried as-is.
interface RetryableQuery<T> extends PromiseLike<QueryResult<T>> {
  abortSignal?(signal: AbortSignal): PromiseLike<QueryResult<T>>;
}

// Next.js memoizes identical GET fetches for the whole server render, so a
// plain re-run of the same query never reaches the network — it gets the
// first attempt's 401 handed straight back. That made this retry a silent
// no-op in every Server Component (it only ever worked in Route Handlers,
// which aren't memoized) and let PGRST303 reach the error page. A fresh
// AbortSignal is Next's documented opt-out, applied to retries only so
// ordinary queries keep their memoization.
function withFreshSignal<T>(query: RetryableQuery<T>): PromiseLike<QueryResult<T>> {
  return typeof query.abortSignal === "function" ? query.abortSignal(new AbortController().signal) : query;
}

// Takes a thunk rather than an already-built query so retrying genuinely
// re-runs the request (including the fetch) instead of re-resolving a
// promise that already settled.
export async function withJwtSkewRetry<T>(run: () => RetryableQuery<T>): Promise<QueryResult<T>> {
  let result = await run();
  for (const delay of RETRY_DELAYS_MS) {
    if (result.error?.code !== JWT_ISSUED_AT_FUTURE) return result;
    await new Promise((resolve) => setTimeout(resolve, delay));
    result = await withFreshSignal(run());
  }
  return result;
}
