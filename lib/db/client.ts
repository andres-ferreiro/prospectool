import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getDb() {
  return createSupabaseServerClient();
}
