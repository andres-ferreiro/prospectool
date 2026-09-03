import { createSavedBusiness, deleteSavedBusiness, listSavedForProject } from "@/lib/db/saved-businesses";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return Response.json({ error: "Falta projectId" }, { status: 400 });
  }

  const saved = await listSavedForProject(projectId);
  return Response.json({ saved });
}

export async function POST(request: Request) {
  const body = await request.json();

  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const businessId = typeof body.businessId === "string" ? body.businessId : "";

  if (!projectId || !businessId) {
    return Response.json({ error: "Falta projectId o businessId" }, { status: 400 });
  }

  const saved = await createSavedBusiness(projectId, businessId);
  return Response.json(saved, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const businessId = searchParams.get("businessId");

  if (!projectId || !businessId) {
    return Response.json({ error: "Falta projectId o businessId" }, { status: 400 });
  }

  await deleteSavedBusiness(projectId, businessId);
  return new Response(null, { status: 204 });
}
