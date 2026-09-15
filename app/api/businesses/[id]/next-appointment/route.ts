import { nextAppointmentForBusiness } from "@/lib/db/appointments";

export async function GET(_request: Request, { params }: RouteContext<"/api/businesses/[id]/next-appointment">) {
  const { id } = await params;
  const appointment = await nextAppointmentForBusiness(id);
  return Response.json({ appointment });
}
