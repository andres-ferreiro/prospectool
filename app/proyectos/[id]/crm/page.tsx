import { notFound } from "next/navigation";
import { getProject, listProjects } from "@/lib/db/projects";
import { listLeadsForProject } from "@/lib/db/leads";
import { CrmPage } from "@/components/crm/crm-page";

export default async function ProyectoCrmPage({ params }: PageProps<"/proyectos/[id]/crm">) {
  const { id } = await params;
  const [project, projects, leads] = await Promise.all([
    getProject(id),
    listProjects(),
    listLeadsForProject(id),
  ]);
  if (!project) notFound();

  return <CrmPage projects={projects} activeProject={project} initialLeads={leads} />;
}
