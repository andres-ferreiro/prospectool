import type { NextRequest } from "next/server";
import { findCachedSearch, getBusinessesForSearch, saveSearchResults } from "@/lib/db/searches";
import { buscarPorAreaActividad, mapDenueRecordToBusiness } from "@/lib/denue/client";

// Standalone "advanced search" — searches by the exact SCIAN class code
// within a manually-picked Estado/Municipio, via DENUE's BuscarAreaAct
// (no lat/lng/radius parameter exists for that endpoint). Reuses the
// existing keyword-based search cache with a synthetic, collision-proof
// keyword + a fixed dummy 0/0/0 center/radius, since the cache key is
// opaque and this path never has a real search center to begin with.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim() ?? "";
  const entidad = searchParams.get("entidad")?.trim() ?? "";
  const municipio = searchParams.get("municipio")?.trim() ?? "";

  if (!/^\d{6}$/.test(code)) {
    return Response.json({ error: "Código SCIAN inválido" }, { status: 400 });
  }
  if (!/^\d{2}$/.test(entidad)) {
    return Response.json({ error: "Entidad inválida" }, { status: 400 });
  }
  if (!/^\d{3}$/.test(municipio)) {
    return Response.json({ error: "Municipio inválido" }, { status: 400 });
  }

  const cacheParams = { keyword: `scian:${code}:${entidad}${municipio}`, lat: 0, lng: 0, radiusM: 0 };

  const cached = await findCachedSearch(cacheParams);
  if (cached) {
    const businesses = await getBusinessesForSearch(cached.id);
    return Response.json({ businesses, cached: true });
  }

  try {
    const raw = await buscarPorAreaActividad({ entidad, municipio, clase: code });
    const mapped = raw.map(mapDenueRecordToBusiness);
    const { businesses } = await saveSearchResults(cacheParams, mapped);
    return Response.json({ businesses, cached: false });
  } catch (err) {
    console.error("Error al consultar DENUE (BuscarAreaAct):", err);
    return Response.json(
      { error: "No se pudieron cargar los negocios desde DENUE" },
      { status: 502 }
    );
  }
}
