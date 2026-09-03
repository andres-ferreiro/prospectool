import { requireUser } from "@/lib/supabase/current-user";
import type { SavedBusinessRow, SavedBusinessWithBusiness } from "./types";

export async function listSavedForProject(projectId: string): Promise<SavedBusinessWithBusiness[]> {
  const { supabase: db, user } = await requireUser();
  const { data, error } = await db
    .from("saved_businesses")
    .select("*, business:businesses(*)")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SavedBusinessWithBusiness[];
}

export async function createSavedBusiness(
  projectId: string,
  businessId: string
): Promise<SavedBusinessRow> {
  const { supabase: db, user } = await requireUser();

  const { data: existing, error: existingError } = await db
    .from("saved_businesses")
    .select()
    .eq("project_id", projectId)
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return existing as SavedBusinessRow;

  const { data, error } = await db
    .from("saved_businesses")
    .insert({ project_id: projectId, business_id: businessId, user_id: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as SavedBusinessRow;
}

export async function deleteSavedBusiness(projectId: string, businessId: string): Promise<void> {
  const { supabase: db, user } = await requireUser();
  const { error } = await db
    .from("saved_businesses")
    .delete()
    .eq("project_id", projectId)
    .eq("business_id", businessId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}
