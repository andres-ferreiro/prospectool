import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("./stripe", () => ({
  PRICE_IDS: { monthly: "price_monthly_test", yearly: "price_yearly_test" },
}));

const { subscriptionRowFromStripe } = await import("./webhook-sync");

function fakeSubscription(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: "sub_123",
    customer: "cus_123",
    status: "active",
    trial_end: null,
    cancel_at_period_end: false,
    items: {
      data: [
        {
          price: { id: "price_monthly_test" },
          current_period_end: 1_800_000_000,
        },
      ],
    },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

describe("subscriptionRowFromStripe", () => {
  it("maps the monthly price id to plan 'monthly'", () => {
    const row = subscriptionRowFromStripe(fakeSubscription(), "user-1");
    expect(row.plan).toBe("monthly");
  });

  it("maps the yearly price id to plan 'yearly'", () => {
    const sub = fakeSubscription({
      items: { data: [{ price: { id: "price_yearly_test" }, current_period_end: 1_800_000_000 }] } as never,
    });
    const row = subscriptionRowFromStripe(sub, "user-1");
    expect(row.plan).toBe("yearly");
  });

  it("maps an unrecognized price id to a null plan", () => {
    const sub = fakeSubscription({
      items: { data: [{ price: { id: "price_unknown" }, current_period_end: 1_800_000_000 }] } as never,
    });
    const row = subscriptionRowFromStripe(sub, "user-1");
    expect(row.plan).toBeNull();
  });

  it("converts the unix current_period_end to an ISO string", () => {
    const row = subscriptionRowFromStripe(fakeSubscription(), "user-1");
    expect(row.current_period_end).toBe(new Date(1_800_000_000 * 1000).toISOString());
  });

  it("converts a null trial_end to null, and a set one to an ISO string", () => {
    const withoutTrial = subscriptionRowFromStripe(fakeSubscription({ trial_end: null }), "user-1");
    expect(withoutTrial.trial_end).toBeNull();

    const withTrial = subscriptionRowFromStripe(fakeSubscription({ trial_end: 1_800_100_000 }), "user-1");
    expect(withTrial.trial_end).toBe(new Date(1_800_100_000 * 1000).toISOString());
  });

  it("passes status and cancel_at_period_end through verbatim", () => {
    const row = subscriptionRowFromStripe(
      fakeSubscription({ status: "past_due" as Stripe.Subscription.Status, cancel_at_period_end: true }),
      "user-1"
    );
    expect(row.status).toBe("past_due");
    expect(row.cancel_at_period_end).toBe(true);
  });

  it("resolves the customer id whether it's a string or an expanded object", () => {
    const stringCustomer = subscriptionRowFromStripe(fakeSubscription({ customer: "cus_abc" }), "user-1");
    expect(stringCustomer.stripe_customer_id).toBe("cus_abc");

    const expandedCustomer = subscriptionRowFromStripe(
      fakeSubscription({ customer: { id: "cus_xyz" } as Stripe.Customer }),
      "user-1"
    );
    expect(expandedCustomer.stripe_customer_id).toBe("cus_xyz");
  });

  it("carries the given user id through", () => {
    const row = subscriptionRowFromStripe(fakeSubscription(), "user-42");
    expect(row.user_id).toBe("user-42");
  });
});
