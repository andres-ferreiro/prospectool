import type Stripe from "stripe";
import { PRICE_IDS } from "./stripe";
import type { BillingPlan, SubscriptionRow } from "@/lib/db/types";

function planFromPriceId(priceId: string | undefined): BillingPlan | null {
  if (priceId === PRICE_IDS.monthly) return "monthly";
  if (priceId === PRICE_IDS.yearly) return "yearly";
  return null;
}

function unixToIso(seconds: number | null | undefined): string | null {
  return seconds == null ? null : new Date(seconds * 1000).toISOString();
}

// Pure event -> row mapping, kept separate from the webhook route so it's
// testable without a network call or a database. `current_period_end` lives
// on the subscription item in this Stripe API version, not the subscription
// itself — see Stripe's SubscriptionItem type.
export function subscriptionRowFromStripe(
  sub: Stripe.Subscription,
  userId: string
): Omit<SubscriptionRow, "created_at"> {
  const item = sub.items.data[0];
  return {
    user_id: userId,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    plan: planFromPriceId(item?.price.id),
    status: sub.status,
    current_period_end: unixToIso(item?.current_period_end),
    trial_end: unixToIso(sub.trial_end),
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };
}
