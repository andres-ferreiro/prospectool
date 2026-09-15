import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getProject, listProjects } from "@/lib/db/projects";
import { getSubscriptionState } from "@/lib/billing/subscription-status";
import { AppShell } from "@/components/app-shell";

export default async function ProyectoPage({ params }: PageProps<"/proyectos/[id]">) {
  const { id } = await params;
  const [project, projects, subscription] = await Promise.all([getProject(id), listProjects(), getSubscriptionState()]);
  if (!project) notFound();

  return (
    // AppShell reads useSearchParams() (for the CRM paywall redirect's
    // ?paywall= param) — Next.js requires that to sit under a Suspense
    // boundary.
    <Suspense>
      <AppShell initialProjects={projects} activeProject={project} isPaid={subscription.isPaid} />
    </Suspense>
  );
}
