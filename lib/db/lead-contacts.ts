import { getDb } from "./client";
import { withJwtSkewRetry } from "@/lib/supabase/query-retry";
import type { LeadContactRow } from "./types";

export interface LeadContactInput {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}

export async function listContactsForLead(leadId: string): Promise<LeadContactRow[]> {
  const db = await getDb();
  const { data, error } = await withJwtSkewRetry(() =>
    db.from("lead_contacts").select().eq("lead_id", leadId).order("created_at", { ascending: true })
  );

  if (error) throw new Error(error.message);
  return (data ?? []) as LeadContactRow[];
}

export async function createLeadContact(leadId: string, input: LeadContactInput): Promise<LeadContactRow> {
  const db = await getDb();
  const { data, error } = await withJwtSkewRetry(() =>
    db
      .from("lead_contacts")
      .insert({ lead_id: leadId, ...input })
      .select()
      .single()
  );

  if (error) throw new Error(error.message);
  return data as LeadContactRow;
}

export async function updateLeadContact(
  contactId: string,
  input: LeadContactInput
): Promise<LeadContactRow> {
  const db = await getDb();
  const { data, error } = await withJwtSkewRetry(() =>
    db.from("lead_contacts").update(input).eq("id", contactId).select().single()
  );

  if (error) throw new Error(error.message);
  return data as LeadContactRow;
}

export async function deleteLeadContact(contactId: string): Promise<void> {
  const db = await getDb();
  const { error } = await withJwtSkewRetry(() => db.from("lead_contacts").delete().eq("id", contactId));
  if (error) throw new Error(error.message);
}
