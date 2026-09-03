import { deleteLeadContact, updateLeadContact } from "@/lib/db/lead-contacts";

function normalize(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/leads/[id]/contacts/[contactId]">
) {
  const { contactId } = await params;
  const body = await request.json();

  const input: { name?: string | null; phone?: string | null; email?: string | null } = {};
  if (body.name !== undefined) input.name = normalize(body.name);
  if (body.phone !== undefined) input.phone = normalize(body.phone);
  if (body.email !== undefined) input.email = normalize(body.email);

  const contact = await updateLeadContact(contactId, input);
  return Response.json(contact);
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/leads/[id]/contacts/[contactId]">
) {
  const { contactId } = await params;
  await deleteLeadContact(contactId);
  return new Response(null, { status: 204 });
}
