import { notFound, redirect } from "next/navigation";
import { getProject, listProjects } from "@/lib/db/projects";
import { listAppointmentsForProject } from "@/lib/db/appointments";
import { canAccessCrm } from "@/lib/billing/limits";
import { getSubscriptionState } from "@/lib/billing/subscription-status";
import { CalendarPage } from "@/components/calendar/calendar-page";
import { monthRange } from "@/lib/calendar/date-range";

export default async function ProyectoCalendarioPage({ params }: PageProps<"/proyectos/[id]/calendario">) {
  const { id } = await params;

  // Same paid-tier gate as the CRM route — appointments are meaningless
  // without leads/businesses to link them to, so this rides the same
  // subscription check rather than introducing a separate tier.
  const subscription = await getSubscriptionState();
  if (!canAccessCrm({ isPaid: subscription.isPaid })) redirect(`/proyectos/${id}?paywall=calendario`);

  const range = monthRange(new Date());
  const [project, projects, appointments] = await Promise.all([
    getProject(id),
    listProjects(),
    listAppointmentsForProject(id, range),
  ]);
  if (!project) notFound();

  return <CalendarPage projects={projects} activeProject={project} initialAppointments={appointments} />;
}
