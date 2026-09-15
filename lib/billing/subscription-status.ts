import { requireUser } from "@/lib/supabase/current-user";
import { withJwtSkewRetry } from "@/lib/supabase/query-retry";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isPaidStatus } from "./limits";
import type { BillingPlan, SubscriptionRow } from "@/lib/db/types";
import type { User } from "@supabase/supabase-js";

export interface SubscriptionState {
  isPaid: boolean;
  status: string | null;
  plan: BillingPlan | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
}

const FREE_STATE: SubscriptionState = {
  isPaid: false,
  status: null,
  plan: null,
  currentPeriodEnd: null,
  trialEnd: null,
  cancelAtPeriodEnd: false,
  stripeCustomerId: null,
};

export async function getSubscriptionState(): Promise<SubscriptionState> {
  const { supabase: db, user } = await requireUser();
  const { data, error } = await withJwtSkewRetry(() =>
    db.from("subscriptions").select().eq("user_id", user.id).maybeSingle()
  );

  if (error) throw new Error(error.message);
  if (!data) return FREE_STATE;

  const row = data as SubscriptionRow;
  return {
    isPaid: isPaidStatus(row.status),
    status: row.status,
    plan: row.plan,
    currentPeriodEnd: row.current_period_end,
    trialEnd: row.trial_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    stripeCustomerId: row.stripe_customer_id,
  };
}

// Called from the checkout route, which needs a Stripe customer id before it
// can create a Checkout Session. Uses the admin client because there is no
// insert policy for users on `subscriptions` by design (see the migration) —
// only the webhook and this bootstrap step may create a row.
export async function ensureStripeCustomer(
  user: User,
  createStripeCustomer: () => Promise<string>
): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data: existing, error: readError } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (existing) return existing.stripe_customer_id as string;

  const customerId = await createStripeCustomer();
  const { error: insertError } = await admin.from("subscriptions").insert({
    user_id: user.id,
    stripe_customer_id: customerId,
    status: "incomplete",
  });
  if (insertError) throw new Error(insertError.message);

  return customerId;
}
