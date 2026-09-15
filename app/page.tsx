import { Suspense } from "react";
import { listProjects } from "@/lib/db/projects";
import { getSubscriptionState, type SubscriptionState } from "@/lib/billing/subscription-status";
import { AppShell } from "@/components/app-shell";

// Stripe's checkout success_url redirects the browser straight here
// (?checkout=exito — see app-shell.tsx) instead of via /precios, so this
// server render's isPaid is what the page opens with instead of staying
// stale until a manual refresh. But the redirect isn't ordered against the
// webhook that actually flips isPaid — Stripe sends both once checkout
// completes, and the webhook can genuinely land a beat after the browser
// does. A few short retries covers that gap without meaningfully
// delaying every other (non-checkout) load, which only ever tries once.
async function resolveSubscriptionState(justCheckedOut: boolean): Promise<SubscriptionState> {
  let state = await getSubscriptionState();
  for (let attempt = 0; justCheckedOut && !state.isPaid && attempt < 4; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    state = await getSubscriptionState();
  }
  return state;
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const justCheckedOut = params.checkout === "exito";

  const [projects, subscription] = await Promise.all([listProjects(), resolveSubscriptionState(justCheckedOut)]);
  return (
    // AppShell reads useSearchParams() (for the CRM paywall redirect's
    // ?paywall= param) — Next.js requires that to sit under a Suspense
    // boundary.
    <Suspense>
      <AppShell initialProjects={projects} activeProject={projects[0] ?? null} isPaid={subscription.isPaid} />
    </Suspense>
  );
}
