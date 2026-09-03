import { getDb } from "@/lib/db/client";
import type { NewBusiness } from "@/lib/db/searches";
import type { BusinessRow } from "@/lib/db/types";
import type { RawDenueRecord } from "@/lib/denue/types";
import type { SiemRow } from "./types";

// SIEM rows use the literal string "sin dato" instead of leaving a field
// empty — normalize that (and blank strings) to null everywhere.
function cleanSiemField(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "sin dato") return null;
  return trimmed;
}

// DENUE's real API responses have no standalone Municipio field — only
// "Ubicacion", a composite "Localidad, Municipio, Estado" string (Localidad
// left space-padded to a fixed width). Municipio is the middle segment.
export function parseMunicipioFromUbicacion(ubicacion: string | undefined | null): string | null {
  if (!ubicacion) return null;
  const parts = ubicacion.split(",").map((p) => p.trim());
  if (parts.length < 3) return null;
  return parts[parts.length - 2] || null;
}

// Given a DENUE business, find likely-matching SIEM-dataset rows (exact
// phone/email, or fuzzy name match scoped to the same municipio) via the
// `siem_matches_for_business` SQL function — see
// supabase/migrations/20260902000000_siem_dataset_integration.sql.
export async function findSiemMatchesForBusiness(business: BusinessRow): Promise<SiemRow[]> {
  const raw = business.raw_json as Partial<RawDenueRecord> | null;
  const municipio = parseMunicipioFromUbicacion(raw?.Ubicacion);

  const db = await getDb();
  const { data, error } = await db.rpc("siem_matches_for_business", {
    p_name: business.name,
    p_phone: business.phone,
    p_email: business.email,
    p_municipio: municipio,
  });
  if (error) throw new Error(error.message);

  return (data ?? []) as SiemRow[];
}

function buildSiemAddress(row: SiemRow): string | null {
  const cp = row.cp != null ? String(row.cp).padStart(5, "0") : null;
  return [row.domicilio, row.colonia, cp].filter(Boolean).join(" ") || null;
}

export function mapSiemRowToBusiness(row: SiemRow): NewBusiness {
  return {
    name: row.razon_social ?? "Sin nombre",
    address: buildSiemAddress(row),
    phone: cleanSiemField(row.telefono),
    email: cleanSiemField(row.e_mail),
    website: null,
    lat: null,
    lng: null,
    source: "siem",
    source_id: row.uuid,
    raw_json: row,
  };
}

// Given SCIAN codes + an Estado/Municipio name, find SIEM-dataset rows in
// that scope that don't already have a matching business in `businesses`
// (any source) — via the `siem_search_by_code` SQL function.
export async function searchSiemByCode(
  codes: number[],
  estadoName: string,
  municipioName: string
): Promise<NewBusiness[]> {
  const db = await getDb();
  const { data, error } = await db.rpc("siem_search_by_code", {
    p_codes: codes,
    p_estado: estadoName,
    p_municipio: municipioName,
  });
  if (error) throw new Error(error.message);

  return ((data ?? []) as SiemRow[]).map(mapSiemRowToBusiness);
}
