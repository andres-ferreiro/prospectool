import Stripe from "stripe";

// Lazy singleton — the Stripe SDK throws at construction time if the API
// key is missing/empty, and this module is imported anywhere PRICE_IDS is
// needed (including lib/billing/webhook-sync.ts's pure mapping function, and
// tests of it). Constructing eagerly at module load would crash any of
// those imports before Stripe is even configured; constructing lazily means
// it only throws when a billing route actually tries to call Stripe.
let cachedClient: Stripe | null = null;

// Pinned explicitly (matches the installed SDK's own default, from
// node_modules/stripe/esm/apiVersion.js) so a future `npm i stripe` upgrade
// can't silently change response shapes out from under the webhook handler.
export function getStripe(): Stripe {
  if (!cachedClient) {
    cachedClient = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-08-26.dahlia" });
  }
  return cachedClient;
}

export const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_MONTHLY!,
  yearly: process.env.STRIPE_PRICE_YEARLY!,
} as const;
