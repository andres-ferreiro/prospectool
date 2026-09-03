import { requireUser } from "@/lib/supabase/current-user";
import type { ProjectRow } from "./types";

export interface CreateProjectInput {
  productService: string;
  keywords: string[];
}

// Every function here is async — call sites already await them, so a future
// change to the underlying data access stays a drop-in swap inside this
// file only. Every query is scoped to the signed-in user both explicitly
// (belt) and via RLS (suspenders).

export async function createProject(input: CreateProjectInput): Promise<ProjectRow> {
  const { supabase: db, user } = await requireUser();
  const { data, error } = await db
    .from("projects")
    .insert({ product_service: input.productService, keywords: input.keywords, user_id: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ProjectRow;
}

export async function getProject(id: string): Promise<ProjectRow | null> {
  const { supabase: db, user } = await requireUser();
  const { data, error } = await db
    .from("projects")
    .select()
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ProjectRow) ?? null;
}

export interface UpdateProjectInput {
  productService?: string;
  keywords?: string[];
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<ProjectRow> {
  const { supabase: db, user } = await requireUser();
  const patch: Record<string, unknown> = {};
  if (input.productService !== undefined) patch.product_service = input.productService;
  if (input.keywords !== undefined) patch.keywords = input.keywords;

  const { data, error } = await db
    .from("projects")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ProjectRow;
}

export async function listProjects(): Promise<ProjectRow[]> {
  const { supabase: db, user } = await requireUser();
  const { data, error } = await db
    .from("projects")
    .select()
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as ProjectRow[]) ?? [];
}
