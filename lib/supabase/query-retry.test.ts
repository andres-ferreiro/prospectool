import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withJwtSkewRetry } from "./query-retry";

const SKEW_ERROR = { message: "JWT issued at future", code: "PGRST303" };

// Stand-in for a Supabase query builder: awaitable, with abortSignal()
// returning a query that resolves to the same result — enough to observe
// whether a retry was sent with a fresh signal.
function fakeQuery<T>(result: T) {
  const signals: AbortSignal[] = [];
  const query = {
    signals,
    then: <R>(onFulfilled: (value: T) => R) => Promise.resolve(result).then(onFulfilled),
    abortSignal(signal: AbortSignal) {
      signals.push(signal);
      return Promise.resolve(result);
    },
  };
  return query;
}

describe("withJwtSkewRetry", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // Advances through every backoff delay so retries run without real waits.
  async function settle<T>(promise: Promise<T>) {
    await vi.runAllTimersAsync();
    return promise;
  }

  it("returns the result as-is when there's no error", async () => {
    const run = vi.fn().mockResolvedValue({ data: "ok", error: null });
    const result = await settle(withJwtSkewRetry(run));
    expect(result).toEqual({ data: "ok", error: null });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("returns the result as-is for an unrelated error, without retrying", async () => {
    const run = vi.fn().mockResolvedValue({ data: null, error: { message: "not found", code: "PGRST116" } });
    const result = await settle(withJwtSkewRetry(run));
    expect(result.error?.code).toBe("PGRST116");
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("retries on PGRST303 and returns the first successful retry", async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: SKEW_ERROR })
      .mockResolvedValueOnce({ data: "recovered", error: null });

    const result = await settle(withJwtSkewRetry(run));
    expect(result).toEqual({ data: "recovered", error: null });
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("gives up after two retries if PGRST303 persists", async () => {
    const run = vi.fn().mockResolvedValue({ data: null, error: SKEW_ERROR });
    const result = await settle(withJwtSkewRetry(run));
    expect(result.error?.code).toBe("PGRST303");
    expect(run).toHaveBeenCalledTimes(3);
  });

  // Regression: Next.js memoizes identical GET fetches for a whole server
  // render, so a retry with the same URL and options never reached the
  // network — it got the first attempt's 401 back. Each retry must carry a
  // fresh AbortSignal (Next's documented opt-out); the first attempt must
  // not, so ordinary queries keep their memoization.
  it("sends every retry with a fresh abort signal, but not the first attempt", async () => {
    const failing = fakeQuery({ data: null, error: SKEW_ERROR });
    const first = fakeQuery({ data: null, error: SKEW_ERROR });
    const recovered = fakeQuery({ data: "recovered", error: null });
    const run = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(failing).mockReturnValueOnce(recovered);

    const result = await settle(withJwtSkewRetry(run));

    expect(result).toEqual({ data: "recovered", error: null });
    expect(first.signals).toHaveLength(0);
    expect(failing.signals).toHaveLength(1);
    expect(recovered.signals).toHaveLength(1);
    expect(failing.signals[0]).not.toBe(recovered.signals[0]);
  });
});
