import { requireUser } from "@/lib/supabase/current-user";
import { withJwtSkewRetry } from "@/lib/supabase/query-retry";
import { getDb } from "./client";
import type { LeadActivityRow, LeadRow, LeadWithBusiness, Stage } from "./types";

export async function listLeadsForProject(projectId: string): Promise<LeadWithBusiness[]> {
  const { supabase: db, user } = await requireUser();
  const { data, error } = await withJwtSkewRetry(() =>
    db
      .from("leads")
      .select("*, business:businesses(*), contacts:lead_contacts(*)")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
  );

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as LeadWithBusiness[];
}

export async function getLeadWithBusiness(id: string): Promise<LeadWithBusiness | null> {
  const { supabase: db, user } = await requireUser();
  const { data, error } = await withJwtSkewRetry(() =>
    db.from("leads").select("*, business:businesses(*)").eq("id", id).eq("user_id", user.id).maybeSingle()
  );

  if (error) throw new Error(error.message);
  return (data as unknown as LeadWithBusiness) ?? null;
}

export async function createLead(projectId: string, businessId: string): Promise<LeadRow> {
  const { supabase: db, user } = await requireUser();

  const { data: existing, error: existingError } = await withJwtSkewRetry(() =>
    db
      .from("leads")
      .select()
      .eq("project_id", projectId)
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle()
  );
  if (existingError) throw new Error(existingError.message);
  if (existing) return existing as LeadRow;

  const { data, error } = await withJwtSkewRetry(() =>
    db
      .from("leads")
      .insert({ project_id: projectId, business_id: businessId, user_id: user.id, stage: "contacted" })
      .select()
      .single()
  );
  if (error) throw new Error(error.message);

  const lead = data as LeadRow;
  const { error: activityError } = await withJwtSkewRetry(() =>
    db.from("lead_activities").insert({ lead_id: lead.id, from_stage: null, to_stage: lead.stage })
  );
  if (activityError) throw new Error(activityError.message);

  return lead;
}

export async function updateLeadStage(id: string, stage: Stage): Promise<LeadRow> {
  const { supabase: db, user } = await requireUser();

  const { data: current, error: currentError } = await withJwtSkewRetry(() =>
    db.from("leads").select("stage").eq("id", id).eq("user_id", user.id).single()
  );
  if (currentError) throw new Error(currentError.message);
  const fromStage = (current as { stage: Stage }).stage;

  const { data, error } = await withJwtSkewRetry(() =>
    db.from("leads").update({ stage }).eq("id", id).eq("user_id", user.id).select().single()
  );
  if (error) throw new Error(error.message);

  const { error: activityError } = await withJwtSkewRetry(() =>
    db.from("lead_activities").insert({ lead_id: id, from_stage: fromStage, to_stage: stage })
  );
  if (activityError) throw new Error(activityError.message);

  return data as LeadRow;
}

export async function updateLeadNotes(id: string, notes: string | null): Promise<LeadRow> {
  const { supabase: db, user } = await requireUser();
  const { data, error } = await withJwtSkewRetry(() =>
    db.from("leads").update({ notes }).eq("id", id).eq("user_id", user.id).select().single()
  );

  if (error) throw new Error(error.message);
  return data as LeadRow;
}

export async function listActivitiesForLead(leadId: string): Promise<LeadActivityRow[]> {
  const db = await getDb();
  const { data, error } = await withJwtSkewRetry(() =>
    db.from("lead_activities").select().eq("lead_id", leadId).order("created_at", { ascending: true })
  );

  if (error) throw new Error(error.message);
  return (data ?? []) as LeadActivityRow[];
}
