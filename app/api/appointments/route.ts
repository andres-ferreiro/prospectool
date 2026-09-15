import { createAppointment, listAppointmentsForProject } from "@/lib/db/appointments";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!projectId || !from || !to) {
    return Response.json({ error: "Falta projectId, from o to" }, { status: 400 });
  }

  const appointments = await listAppointmentsForProject(projectId, { from, to });
  return Response.json({ appointments });
}

export async function POST(request: Request) {
  const body = await request.json();

  const projectId = typeof body.project_id === "string" ? body.project_id : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const startAt = typeof body.start_at === "string" ? body.start_at : "";
  const endAt = typeof body.end_at === "string" ? body.end_at : "";

  if (!projectId || !title || !startAt || !endAt) {
    return Response.json({ error: "Falta project_id, title, start_at o end_at" }, { status: 400 });
  }

  const appointment = await createAppointment({
    project_id: projectId,
    lead_id: typeof body.lead_id === "string" ? body.lead_id : null,
    business_id: typeof body.business_id === "string" ? body.business_id : null,
    title,
    notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
    location: typeof body.location === "string" ? body.location.trim() || null : null,
    start_at: startAt,
    end_at: endAt,
  });
  return Response.json(appointment, { status: 201 });
}
