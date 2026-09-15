import { requireUser } from "@/lib/supabase/current-user";
import { withJwtSkewRetry } from "@/lib/supabase/query-retry";
import { getDb } from "./client";
import type { AppointmentRow, AppointmentStatus, AppointmentWithRelations } from "./types";

export interface AppointmentInput {
  project_id: string;
  lead_id?: string | null;
  business_id?: string | null;
  title: string;
  notes?: string | null;
  location?: string | null;
  start_at: string;
  end_at: string;
}

export interface AppointmentPatch {
  title?: string;
  notes?: string | null;
  location?: string | null;
  start_at?: string;
  end_at?: string;
  status?: AppointmentStatus;
}

const WITH_RELATIONS = "*, business:businesses(*), lead:leads(*)";

export async function listAppointmentsForProject(
  projectId: string,
  range: { from: string; to: string }
): Promise<AppointmentWithRelations[]> {
  const { supabase: db, user } = await requireUser();
  const { data, error } = await withJwtSkewRetry(() =>
    db
      .from("appointments")
      .select(WITH_RELATIONS)
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .gte("start_at", range.from)
      .lte("start_at", range.to)
      .order("start_at", { ascending: true })
  );

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AppointmentWithRelations[];
}

export async function getAppointment(id: string): Promise<AppointmentWithRelations | null> {
  const { supabase: db, user } = await requireUser();
  const { data, error } = await withJwtSkewRetry(() =>
    db.from("appointments").select(WITH_RELATIONS).eq("id", id).eq("user_id", user.id).maybeSingle()
  );

  if (error) throw new Error(error.message);
  return (data as unknown as AppointmentWithRelations) ?? null;
}

export async function createAppointment(input: AppointmentInput): Promise<AppointmentWithRelations> {
  const { supabase: db, user } = await requireUser();
  const { data, error } = await withJwtSkewRetry(() =>
    db
      .from("appointments")
      .insert({
        project_id: input.project_id,
        user_id: user.id,
        lead_id: input.lead_id ?? null,
        business_id: input.business_id ?? null,
        title: input.title,
        notes: input.notes ?? null,
        location: input.location ?? null,
        start_at: input.start_at,
        end_at: input.end_at,
      })
      .select(WITH_RELATIONS)
      .single()
  );

  if (error) throw new Error(error.message);
  return data as unknown as AppointmentWithRelations;
}

export async function updateAppointment(id: string, patch: AppointmentPatch): Promise<AppointmentWithRelations> {
  const { supabase: db, user } = await requireUser();
  const { data, error } = await withJwtSkewRetry(() =>
    db.from("appointments").update(patch).eq("id", id).eq("user_id", user.id).select(WITH_RELATIONS).single()
  );

  if (error) throw new Error(error.message);
  return data as unknown as AppointmentWithRelations;
}

export async function deleteAppointment(id: string): Promise<void> {
  const { supabase: db, user } = await requireUser();
  const { error } = await withJwtSkewRetry(() =>
    db.from("appointments").delete().eq("id", id).eq("user_id", user.id)
  );
  if (error) throw new Error(error.message);
}

async function nextAppointmentFor(column: "lead_id" | "business_id", id: string): Promise<AppointmentRow | null> {
  const db = await getDb();
  const { data, error } = await withJwtSkewRetry(() =>
    db
      .from("appointments")
      .select()
      .eq(column, id)
      .eq("status", "scheduled")
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(1)
      .maybeSingle()
  );

  if (error) throw new Error(error.message);
  return (data as AppointmentRow) ?? null;
}

export function nextAppointmentForLead(leadId: string): Promise<AppointmentRow | null> {
  return nextAppointmentFor("lead_id", leadId);
}

export function nextAppointmentForBusiness(businessId: string): Promise<AppointmentRow | null> {
  return nextAppointmentFor("business_id", businessId);
}
