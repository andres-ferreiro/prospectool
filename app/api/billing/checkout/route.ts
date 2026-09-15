import { requireUser } from "@/lib/supabase/current-user";
import { getStripe, PRICE_IDS } from "@/lib/billing/stripe";
import { ensureStripeCustomer, getSubscriptionState } from "@/lib/billing/subscription-status";
import type { BillingPlan } from "@/lib/db/types";

function isBillingPlan(value: unknown): value is BillingPlan {
  return value === "monthly" || value === "yearly";
}

export async function POST(request: Request) {
  const body = await request.json();
  const plan: unknown = body.plan;
  if (!isBillingPlan(plan)) {
    return Response.json({ error: "Plan inválido" }, { status: 400 });
  }

  const { user } = await requireUser();

  const subscription = await getSubscriptionState();
  if (subscription.isPaid) {
    return Response.json({ error: "Ya tienes una suscripción activa" }, { status: 409 });
  }

  const stripe = getStripe();
  try {
    const customerId = await ensureStripeCustomer(user, async () => {
      const customer = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } });
      return customer.id;
    });

    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      locale: "es",
      line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
      subscription_data: {
        metadata: { user_id: user.id, plan },
        // 7-day trial only on the yearly plan; the monthly plan's "5 MXN
        // first month" instead comes from the once-only coupon below.
        ...(plan === "yearly"
          ? {
              trial_period_days: 7,
              trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
            }
          : {}),
      },
      // A card must be on file up front for the trial to actually convert to
      // a real charge on day 8 — otherwise Stripe has nothing to bill.
      ...(plan === "yearly" ? { payment_method_collection: "always" } : {}),
      ...(plan === "monthly" ? { discounts: [{ coupon: process.env.STRIPE_COUPON_FIRST_MONTH! }] } : {}),
      // Straight to the map, not /precios — landing there directly (a real
      // browser redirect, not a client-side transition) is what makes
      // AppShell's isPaid come back correct immediately instead of staying
      // stale until a manual refresh. See app-shell.tsx's ?checkout=exito
      // handling and app/page.tsx's resolveSubscriptionState.
      success_url: `${origin}/?checkout=exito`,
      cancel_url: `${origin}/precios?estado=cancelado`,
    });

    if (!session.url) {
      return Response.json({ error: "No se pudo iniciar el pago" }, { status: 500 });
    }

    return Response.json({ url: session.url });
  } catch (err) {
    // Never forward the raw Stripe error to the client — it can include
    // request internals not meant to leave the server.
    console.error("[billing/checkout]", err);
    return Response.json({ error: "No se pudo iniciar el pago" }, { status: 502 });
  }
}
