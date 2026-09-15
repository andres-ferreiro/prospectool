import { nextAppointmentForLead } from "@/lib/db/appointments";

export async function GET(_request: Request, { params }: RouteContext<"/api/leads/[id]/next-appointment">) {
  const { id } = await params;
  const appointment = await nextAppointmentForLead(id);
  return Response.json({ appointment });
}
