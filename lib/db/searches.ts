import { getDb } from "./client";
import type { BusinessRow, DenueSearchRow } from "./types";

export type NewBusiness = Omit<BusinessRow, "id" | "created_at">;

export interface SearchParams {
  keyword: string;
  lat: number;
  lng: number;
  radiusM: number;
}

// Round to ~11m precision so re-searching (almost) the same spot with the
// same keyword and radius counts as a cache hit.
function roundCoord(n: number) {
  return Math.round(n * 10000) / 10000;
}

export async function findCachedSearch(params: SearchParams): Promise<DenueSearchRow | null> {
  const db = await getDb();
  const { data, error } = await db
    .from("denue_searches")
    .select()
    .eq("keyword", params.keyword)
    .eq("radius_m", params.radiusM)
    .order("fetched_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  const targetLat = roundCoord(params.lat);
  const targetLng = roundCoord(params.lng);
  const match = (data as DenueSearchRow[] | null)?.find(
    (s) => roundCoord(s.center_lat) === targetLat && roundCoord(s.center_lng) === targetLng
  );
  return match ?? null;
}

export async function getBusinessesForSearch(searchId: string): Promise<BusinessRow[]> {
  const db = await getDb();
  const { data, error } = await db
    .from("search_results")
    .select("business:businesses(*)")
    .eq("search_id", searchId);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as { business: BusinessRow }[])
    .map((row) => row.business)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Shared by the DENUE search cache below and the standalone SIEM lookup
// (lib/siem/match.ts callers) — both upsert on (source, source_id) so
// re-fetching the same record just refreshes it instead of duplicating it.
export async function upsertBusinesses(businesses: NewBusiness[]): Promise<BusinessRow[]> {
  if (businesses.length === 0) return [];

  const db = await getDb();
  const { data: upserted, error: upsertError } = await db
    .from("businesses")
    .upsert(
      businesses.map((b) => ({
        name: b.name,
        address: b.address,
        phone: b.phone,
        email: b.email,
        website: b.website,
        lat: b.lat,
        lng: b.lng,
        source: b.source,
        source_id: b.source_id,
        raw_json: b.raw_json,
      })),
      { onConflict: "source,source_id" }
    )
    .select();
  if (upsertError) throw new Error(upsertError.message);

  return upserted as BusinessRow[];
}

export async function saveSearchResults(
  params: SearchParams,
  businesses: NewBusiness[]
): Promise<{ search: DenueSearchRow; businesses: BusinessRow[] }> {
  const db = await getDb();

  const { data: search, error: searchError } = await db
    .from("denue_searches")
    .insert({
      keyword: params.keyword,
      center_lat: params.lat,
      center_lng: params.lng,
      radius_m: params.radiusM,
      result_count: businesses.length,
    })
    .select()
    .single();
  if (searchError) throw new Error(searchError.message);

  const searchRow = search as DenueSearchRow;
  if (businesses.length === 0) {
    return { search: searchRow, businesses: [] };
  }

  const businessRows = await upsertBusinesses(businesses);

  const { error: linkError } = await db
    .from("search_results")
    .upsert(
      businessRows.map((b) => ({ search_id: searchRow.id, business_id: b.id })),
      { onConflict: "search_id,business_id" }
    );
  if (linkError) throw new Error(linkError.message);

  return { search: searchRow, businesses: businessRows };
}
