// PGRST303 ("JWT issued at future") is a known Supabase-side bug, not a
// problem with the token or a local clock: PostgREST caches its notion of
// "now" instead of reading the system clock per request, and that cache
// occasionally lags a moment behind real time — so a token issued right
// now can briefly look like it's from the future and get rejected.
// See https://github.com/orgs/supabase/discussions/48123.
//
// It's a momentary race, not a real auth failure — retrying a beat later
// succeeds once the cache catches up, so every query in lib/db/ routes
// through this instead of surfacing the error to the user.
const JWT_ISSUED_AT_FUTURE = "PGRST303";

interface QueryResult<T> {
  data: T;
  error: { message: string; code?: string } | null;
}

// Takes a thunk rather than an already-built query so retrying genuinely
// re-runs the request (including the fetch) instead of re-resolving a
// promise that already settled.
export async function withJwtSkewRetry<T>(run: () => PromiseLike<QueryResult<T>>): Promise<QueryResult<T>> {
  const first = await run();
  if (first.error?.code !== JWT_ISSUED_AT_FUTURE) return first;
  await new Promise((resolve) => setTimeout(resolve, 400));
  return run();
}
