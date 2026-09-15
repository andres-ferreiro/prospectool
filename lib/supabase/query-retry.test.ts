import { describe, expect, it, vi } from "vitest";
import { withJwtSkewRetry } from "./query-retry";

describe("withJwtSkewRetry", () => {
  it("returns the result as-is when there's no error", async () => {
    const run = vi.fn().mockResolvedValue({ data: "ok", error: null });
    const result = await withJwtSkewRetry(run);
    expect(result).toEqual({ data: "ok", error: null });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("returns the result as-is for an unrelated error, without retrying", async () => {
    const run = vi.fn().mockResolvedValue({ data: null, error: { message: "not found", code: "PGRST116" } });
    const result = await withJwtSkewRetry(run);
    expect(result.error?.code).toBe("PGRST116");
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("retries exactly once on PGRST303 and returns the retry's result", async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: "JWT issued at future", code: "PGRST303" } })
      .mockResolvedValueOnce({ data: "recovered", error: null });

    const result = await withJwtSkewRetry(run);
    expect(result).toEqual({ data: "recovered", error: null });
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("doesn't retry a second time if PGRST303 persists", async () => {
    const run = vi.fn().mockResolvedValue({ data: null, error: { message: "JWT issued at future", code: "PGRST303" } });
    const result = await withJwtSkewRetry(run);
    expect(result.error?.code).toBe("PGRST303");
    expect(run).toHaveBeenCalledTimes(2);
  });
});
