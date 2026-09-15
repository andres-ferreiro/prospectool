import { notFound, redirect } from "next/navigation";
import { getProject, listProjects } from "@/lib/db/projects";
import { listLeadsForProject } from "@/lib/db/leads";
import { canAccessCrm } from "@/lib/billing/limits";
import { getSubscriptionState } from "@/lib/billing/subscription-status";
import { CrmPage } from "@/components/crm/crm-page";

export default async function ProyectoCrmPage({ params }: PageProps<"/proyectos/[id]/crm">) {
  const { id } = await params;

  // Checked before any other query — a free user shouldn't pay for three
  // DB round-trips just to be told no. Redirects to this project's own map
  // (not the standalone /precios page) with a marker AppShell reads to open
  // the paywall modal in place — see app-shell.tsx.
  const subscription = await getSubscriptionState();
  if (!canAccessCrm({ isPaid: subscription.isPaid })) redirect(`/proyectos/${id}?paywall=crm`);

  const [project, projects, leads] = await Promise.all([
    getProject(id),
    listProjects(),
    listLeadsForProject(id),
  ]);
  if (!project) notFound();

  return <CrmPage projects={projects} activeProject={project} initialLeads={leads} />;
}
