import { createClient } from "@supabase/supabase-js";

// Bypasses RLS via the service-role key. Used by the Stripe webhook (no
// user session — must write subscription rows on the user's behalf) and by
// lib/billing/subscription-status.ts's ensureStripeCustomer (subscriptions
// has no insert policy by design, so bootstrapping a user's own row also
// needs it). Both call sites scope every query/write to a user id obtained
// server-side (webhook metadata, or requireUser()'s verified session) —
// never a client-supplied one. Never import this from a component, and
// never use it to satisfy a client-supplied id.
export function createSupabaseAdminClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
