import { getSubscriptionState } from "@/lib/billing/subscription-status";
import { PricingPlans } from "@/components/billing/pricing-plans";

export default async function PreciosPage({ searchParams }: PageProps<"/precios">) {
  const params = await searchParams;
  const state = await getSubscriptionState();
  const reason = typeof params.desde === "string" ? params.desde : null;
  const status = typeof params.estado === "string" ? params.estado : null;

  return (
    <main className="flex min-h-dvh w-full justify-center bg-sheet px-4 py-16">
      <div className="w-full max-w-2xl">
        <PricingPlans state={state} reason={reason} status={status} />
      </div>
    </main>
  );
}
