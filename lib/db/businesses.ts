import { getDb } from "./client";
import { withJwtSkewRetry } from "@/lib/supabase/query-retry";
import type { BusinessRow } from "./types";

export async function getBusinessById(id: string): Promise<BusinessRow | null> {
  const db = await getDb();
  const { data, error } = await withJwtSkewRetry(() => db.from("businesses").select().eq("id", id).maybeSingle());
  if (error) throw new Error(error.message);
  return data as BusinessRow | null;
}

// Used by the SIEM enrichment flow to fill in an email/phone DENUE didn't
// have — never overwrites a field the business already has.
export async function fillMissingContactInfo(
  id: string,
  fields: { phone?: string | null; email?: string | null }
): Promise<BusinessRow> {
  const db = await getDb();
  const { data, error } = await withJwtSkewRetry(() =>
    db.from("businesses").update(fields).eq("id", id).select().single()
  );
  if (error) throw new Error(error.message);
  return data as BusinessRow;
}
