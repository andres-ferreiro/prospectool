import { describe, expect, it, vi } from "vitest";
import { getSubscriptionState } from "./subscription-status";

function mockDb(result: { data: unknown; error: { message: string } | null }) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve(result),
        }),
      }),
    }),
  };
}

vi.mock("@/lib/supabase/current-user", () => ({
  requireUser: vi.fn(),
}));

const { requireUser } = await import("@/lib/supabase/current-user");

describe("getSubscriptionState", () => {
  it("returns the free state when no row exists", async () => {
    vi.mocked(requireUser).mockResolvedValue({
      supabase: mockDb({ data: null, error: null }) as never,
      user: { id: "u1" } as never,
    });

    const state = await getSubscriptionState();
    expect(state).toEqual({
      isPaid: false,
      status: null,
      plan: null,
      currentPeriodEnd: null,
      trialEnd: null,
      cancelAtPeriodEnd: false,
      stripeCustomerId: null,
    });
  });

  it("maps an active row to isPaid true with all fields carried through", async () => {
    vi.mocked(requireUser).mockResolvedValue({
      supabase: mockDb({
        data: {
          user_id: "u1",
          stripe_customer_id: "cus_123",
          stripe_subscription_id: "sub_123",
          plan: "monthly",
          status: "active",
          current_period_end: "2026-10-01T00:00:00.000Z",
          trial_end: null,
          cancel_at_period_end: false,
          created_at: "2026-09-01T00:00:00.000Z",
          updated_at: "2026-09-01T00:00:00.000Z",
        },
        error: null,
      }) as never,
      user: { id: "u1" } as never,
    });

    const state = await getSubscriptionState();
    expect(state.isPaid).toBe(true);
    expect(state.plan).toBe("monthly");
    expect(state.stripeCustomerId).toBe("cus_123");
    expect(state.currentPeriodEnd).toBe("2026-10-01T00:00:00.000Z");
  });

  it("treats a trialing row as paid", async () => {
    vi.mocked(requireUser).mockResolvedValue({
      supabase: mockDb({
        data: {
          user_id: "u1",
          stripe_customer_id: "cus_123",
          stripe_subscription_id: "sub_123",
          plan: "yearly",
          status: "trialing",
          current_period_end: null,
          trial_end: "2026-09-11T00:00:00.000Z",
          cancel_at_period_end: false,
          created_at: "2026-09-01T00:00:00.000Z",
          updated_at: "2026-09-01T00:00:00.000Z",
        },
        error: null,
      }) as never,
      user: { id: "u1" } as never,
    });

    const state = await getSubscriptionState();
    expect(state.isPaid).toBe(true);
  });

  it("treats a canceled row as unpaid", async () => {
    vi.mocked(requireUser).mockResolvedValue({
      supabase: mockDb({
        data: {
          user_id: "u1",
          stripe_customer_id: "cus_123",
          stripe_subscription_id: "sub_123",
          plan: "monthly",
          status: "canceled",
          current_period_end: null,
          trial_end: null,
          cancel_at_period_end: false,
          created_at: "2026-09-01T00:00:00.000Z",
          updated_at: "2026-09-01T00:00:00.000Z",
        },
        error: null,
      }) as never,
      user: { id: "u1" } as never,
    });

    const state = await getSubscriptionState();
    expect(state.isPaid).toBe(false);
  });

  it("throws on a query error", async () => {
    vi.mocked(requireUser).mockResolvedValue({
      supabase: mockDb({ data: null, error: { message: "boom" } }) as never,
      user: { id: "u1" } as never,
    });

    await expect(getSubscriptionState()).rejects.toThrow("boom");
  });
});
