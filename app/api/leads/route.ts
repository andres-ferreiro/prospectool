import { createLead, listLeadsForProject } from "@/lib/db/leads";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return Response.json({ error: "Falta projectId" }, { status: 400 });
  }

  const leads = await listLeadsForProject(projectId);
  return Response.json({ leads });
}

export async function POST(request: Request) {
  const body = await request.json();

  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const businessId = typeof body.businessId === "string" ? body.businessId : "";

  if (!projectId || !businessId) {
    return Response.json({ error: "Falta projectId o businessId" }, { status: 400 });
  }

  const lead = await createLead(projectId, businessId);
  return Response.json(lead, { status: 201 });
}
