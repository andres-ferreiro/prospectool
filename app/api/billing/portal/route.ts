import { requireUser } from "@/lib/supabase/current-user";
import { getStripe } from "@/lib/billing/stripe";
import { getSubscriptionState } from "@/lib/billing/subscription-status";

export async function POST(request: Request) {
  await requireUser();

  const subscription = await getSubscriptionState();
  if (!subscription.stripeCustomerId) {
    return Response.json({ error: "No tienes una suscripción" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${origin}/precios`,
      locale: "es",
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("[billing/portal]", err);
    return Response.json({ error: "No se pudo abrir el portal de pago" }, { status: 502 });
  }
}
