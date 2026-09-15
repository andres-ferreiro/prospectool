import { deleteAppointment, getAppointment, updateAppointment } from "@/lib/db/appointments";
import { APPOINTMENT_STATUSES, type AppointmentStatus } from "@/lib/db/types";

function isStatus(value: unknown): value is AppointmentStatus {
  return typeof value === "string" && (APPOINTMENT_STATUSES as readonly string[]).includes(value);
}

export async function GET(_request: Request, { params }: RouteContext<"/api/appointments/[id]">) {
  const { id } = await params;

  const appointment = await getAppointment(id);
  if (!appointment) {
    return Response.json({ error: "Cita no encontrada" }, { status: 404 });
  }
  return Response.json(appointment);
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/appointments/[id]">) {
  const { id } = await params;
  const body = await request.json();

  if (body.status !== undefined && !isStatus(body.status)) {
    return Response.json({ error: "Estado inválido" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.title === "string") patch.title = body.title.trim();
  if (body.notes !== undefined) patch.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  if (body.location !== undefined)
    patch.location = typeof body.location === "string" ? body.location.trim() || null : null;
  if (typeof body.start_at === "string") patch.start_at = body.start_at;
  if (typeof body.end_at === "string") patch.end_at = body.end_at;
  if (isStatus(body.status)) patch.status = body.status;

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const appointment = await updateAppointment(id, patch);
  return Response.json(appointment);
}

export async function DELETE(_request: Request, { params }: RouteContext<"/api/appointments/[id]">) {
  const { id } = await params;
  await deleteAppointment(id);
  return new Response(null, { status: 204 });
}
