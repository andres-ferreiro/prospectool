import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { subscriptionRowFromStripe } from "@/lib/billing/webhook-sync";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Called by Stripe's servers, not a signed-in browser — no cookies, no
// requireUser(). Auth is the request signature instead (verified below),
// and every write bypasses RLS via the service-role client since there's no
// user session to scope a query to.

async function upsertFromSubscription(sub: Stripe.Subscription) {
  const admin = createSupabaseAdminClient();

  const userId =
    (sub.metadata?.user_id as string | undefined) ??
    (
      await admin
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", typeof sub.customer === "string" ? sub.customer : sub.customer.id)
        .maybeSingle()
    ).data?.user_id;

  if (!userId) {
    console.error("[stripe-webhook] no user_id resolvable for subscription", sub.id);
    return;
  }

  const row = subscriptionRowFromStripe(sub, userId);
  const { error } = await admin.from("subscriptions").upsert(row, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[stripe-webhook] firma inválida", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (typeof session.subscription === "string") {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await upsertFromSubscription(sub);
        } else if (session.subscription) {
          await upsertFromSubscription(session.subscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await upsertFromSubscription(event.data.object);
        break;
      }
      case "customer.subscription.deleted": {
        const admin = createSupabaseAdminClient();
        const customerId =
          typeof event.data.object.customer === "string" ? event.data.object.customer : event.data.object.customer.id;
        const { error } = await admin
          .from("subscriptions")
          .update({ status: "canceled", cancel_at_period_end: false, updated_at: new Date().toISOString() })
          .eq("stripe_customer_id", customerId);
        if (error) throw new Error(error.message);
        break;
      }
      case "invoice.payment_failed": {
        // No write needed — a customer.subscription.updated with status
        // past_due accompanies this event and is handled above. Logged for
        // observability only.
        console.error("[stripe-webhook] pago fallido", event.data.object.id);
        break;
      }
      default:
        console.log(`[stripe-webhook] evento sin manejar: ${event.type}`);
    }
  } catch (err) {
    // 500 so Stripe retries — the difference between this and the signature
    // check above: a bad signature will never succeed on retry, a DB error
    // might (e.g. a transient Supabase blip).
    console.error(`[stripe-webhook] error procesando ${event.type}`, err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return Response.json({ received: true });
}
