import { listProjects } from "@/lib/db/projects";
import { AppShell } from "@/components/app-shell";

export default async function Home() {
  const projects = await listProjects();
  return <AppShell initialProjects={projects} activeProject={projects[0] ?? null} />;
}
