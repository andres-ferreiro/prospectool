import { createLeadContact, listContactsForLead } from "@/lib/db/lead-contacts";

function normalize(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

export async function GET(_request: Request, { params }: RouteContext<"/api/leads/[id]/contacts">) {
  const { id } = await params;
  const contacts = await listContactsForLead(id);
  return Response.json({ contacts });
}

export async function POST(request: Request, { params }: RouteContext<"/api/leads/[id]/contacts">) {
  const { id } = await params;
  const body = await request.json();

  const contact = await createLeadContact(id, {
    name: normalize(body.name),
    phone: normalize(body.phone),
    email: normalize(body.email),
  });

  return Response.json(contact, { status: 201 });
}
