import { notFound } from "next/navigation";
import { getProject, listProjects } from "@/lib/db/projects";
import { AppShell } from "@/components/app-shell";

export default async function ProyectoPage({ params }: PageProps<"/proyectos/[id]">) {
  const { id } = await params;
  const [project, projects] = await Promise.all([getProject(id), listProjects()]);
  if (!project) notFound();

  return <AppShell initialProjects={projects} activeProject={project} />;
}
