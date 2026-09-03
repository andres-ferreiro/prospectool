import { getLeadWithBusiness, listActivitiesForLead, updateLeadNotes, updateLeadStage } from "@/lib/db/leads";
import { listContactsForLead } from "@/lib/db/lead-contacts";
import { STAGES, type Stage } from "@/lib/db/types";

function isStage(value: unknown): value is Stage {
  return typeof value === "string" && (STAGES as readonly string[]).includes(value);
}

export async function GET(_request: Request, { params }: RouteContext<"/api/leads/[id]">) {
  const { id } = await params;

  const lead = await getLeadWithBusiness(id);
  if (!lead) {
    return Response.json({ error: "Lead no encontrado" }, { status: 404 });
  }
  const [activities, contacts] = await Promise.all([listActivitiesForLead(id), listContactsForLead(id)]);

  return Response.json({ lead, activities, contacts });
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/leads/[id]">) {
  const { id } = await params;
  const body = await request.json();

  let lead = null;

  if (body.stage !== undefined) {
    if (!isStage(body.stage)) {
      return Response.json({ error: "Etapa inválida" }, { status: 400 });
    }
    lead = await updateLeadStage(id, body.stage);
  }

  if (body.notes !== undefined) {
    const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
    lead = await updateLeadNotes(id, notes);
  }

  if (!lead) {
    return Response.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  return Response.json(lead);
}
