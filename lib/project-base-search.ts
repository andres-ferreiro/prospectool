import type { ProjectBaseSearch } from "@/lib/db/types";

export const DEFAULT_SEARCH_RADIUS_M = 1500;
// Same cap as advanced-search-drawer.tsx's MAX_CATEGORIES.
const MAX_SCIAN_CODES = 25;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

// Pure validator for anything arriving from a request body — returns null
// for a malformed shape rather than trusting a jsonb column with it.
export function parseBaseSearch(input: unknown): ProjectBaseSearch | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;

  let center: ProjectBaseSearch["center"] = null;
  if (raw.center != null) {
    const c = raw.center as Record<string, unknown>;
    if (typeof c !== "object" || !isFiniteNumber(c.lat) || !isFiniteNumber(c.lng)) return null;
    if (Math.abs(c.lat) > 90 || Math.abs(c.lng) > 180) return null;
    center = { lat: c.lat, lng: c.lng };
  }

  // Same 500–5000 m window /api/denue/search enforces — a radius outside it
  // would store a project whose every search fails at the API.
  const radiusM = raw.radiusM === undefined ? DEFAULT_SEARCH_RADIUS_M : raw.radiusM;
  if (!isFiniteNumber(radiusM) || radiusM < 500 || radiusM > 5000) return null;

  const entidad = raw.entidad ?? null;
  if (entidad !== null && (typeof entidad !== "string" || !/^\d{2}$/.test(entidad))) return null;
  const municipio = raw.municipio ?? null;
  if (municipio !== null && (typeof municipio !== "string" || !/^\d{3}$/.test(municipio))) return null;

  return {
    center,
    radiusM: Math.round(radiusM),
    entidad,
    municipio,
    scianCodes: parseScianCodes(raw.scianCodes),
  };
}

export function parseScianCodes(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const codes = input.filter((code): code is string => typeof code === "string" && /^\d{6}$/.test(code));
  return Array.from(new Set(codes)).slice(0, MAX_SCIAN_CODES);
}

// The category half only runs with codes AND a resolved municipio — DENUE's
// category endpoint has no lat/lng/radius, only estado + municipio.
export function hasCategorySearch(
  base: ProjectBaseSearch | null
): base is ProjectBaseSearch & { entidad: string; municipio: string } {
  return !!base && base.scianCodes.length > 0 && !!base.entidad && !!base.municipio;
}
