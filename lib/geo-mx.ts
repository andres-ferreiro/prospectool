import { ENTIDADES } from "@/lib/inegi/entidades";
import { MUNICIPIOS } from "@/lib/inegi/municipios";
import { normalizeSpanish } from "@/lib/scian/groups";

function fuzzyNameMatch(a: string, b: string): boolean {
  const na = normalizeSpanish(a);
  const nb = normalizeSpanish(b);
  return na.includes(nb) || nb.includes(na);
}

export interface ReverseGeocodedLocation {
  entidad: string | null;
  municipio: string | null;
}

// Pure — fuzzy-matches Mapbox's region/place text against the app's own
// INEGI catalogs (names don't always match exactly, e.g. Mapbox's
// "Coahuila" vs. INEGI's "Coahuila de Zaragoza"), independent of the
// network call so it's unit-testable without mocking fetch.
export function matchEntidadMunicipio(
  regionText: string | null,
  placeText: string | null
): ReverseGeocodedLocation {
  if (!regionText) return { entidad: null, municipio: null };

  const matchedEntidad = ENTIDADES.find((e) => fuzzyNameMatch(e.name, regionText));
  if (!matchedEntidad) return { entidad: null, municipio: null };

  if (!placeText) return { entidad: matchedEntidad.code, municipio: null };
  const matchedMunicipio = MUNICIPIOS.find(
    (m) => m.entidadCode === matchedEntidad.code && fuzzyNameMatch(m.name, placeText)
  );
  return { entidad: matchedEntidad.code, municipio: matchedMunicipio?.municipioCode ?? null };
}

// Reverse-geocodes coordinates to an INEGI Estado + Municipio via Mapbox.
// Best-effort: any failure (missing token, network error, no match)
// resolves to nulls rather than throwing — every caller treats this as an
// optional shortcut past manual Estado/Municipio entry, never a hard
// requirement.
export async function reverseGeocodeToEntidadMunicipio(coords: {
  lat: number;
  lng: number;
}): Promise<ReverseGeocodedLocation> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return { entidad: null, municipio: null };

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?types=region,place&country=mx&access_token=${token}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const features = (data.features ?? []) as { text: string; place_type: string[] }[];
    const regionText = features.find((f) => f.place_type.includes("region"))?.text ?? null;
    const placeText = features.find((f) => f.place_type.includes("place"))?.text ?? null;
    return matchEntidadMunicipio(regionText, placeText);
  } catch {
    return { entidad: null, municipio: null };
  }
}

// Forward-geocodes an INEGI Estado + Municipio pair to map coordinates via
// Mapbox — the manual path of the onboarding location step needs a center
// for the keyword (radius) search, which the codes alone can't provide.
// Best-effort like the reverse lookup above: resolves to null on any failure.
export async function geocodeEntidadMunicipio(
  entidadCode: string,
  municipioCode: string
): Promise<{ lat: number; lng: number } | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const entidad = ENTIDADES.find((e) => e.code === entidadCode);
  const municipio = MUNICIPIOS.find((m) => m.entidadCode === entidadCode && m.municipioCode === municipioCode);
  if (!token || !entidad || !municipio) return null;

  const query = encodeURIComponent(`${municipio.name}, ${entidad.name}`);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?country=mx&limit=1&access_token=${token}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const center = (data.features?.[0]?.center ?? null) as [number, number] | null;
    return center ? { lat: center[1], lng: center[0] } : null;
  } catch {
    return null;
  }
}
