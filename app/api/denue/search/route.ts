import type { NextRequest } from "next/server";
import { findCachedSearch, getBusinessesForSearch, saveSearchResults } from "@/lib/db/searches";
import { buscarDenue, mapDenueRecordToBusiness } from "@/lib/denue/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword")?.trim() ?? "";
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radiusM = Number(searchParams.get("radiusM"));

  if (!keyword) {
    return Response.json({ error: "Falta el término de búsqueda" }, { status: 400 });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "Ubicación inválida" }, { status: 400 });
  }
  if (!Number.isFinite(radiusM) || radiusM < 500 || radiusM > 5000) {
    return Response.json({ error: "El radio debe estar entre 500 y 5000 metros" }, { status: 400 });
  }

  const params = { keyword, lat, lng, radiusM };

  const cached = await findCachedSearch(params);
  if (cached) {
    const businesses = await getBusinessesForSearch(cached.id);
    return Response.json({ businesses, cached: true });
  }

  try {
    const raw = await buscarDenue({ keyword, lat, lng, radiusM });
    const mapped = raw.map(mapDenueRecordToBusiness);
    const { businesses } = await saveSearchResults(params, mapped);
    return Response.json({ businesses, cached: false });
  } catch (err) {
    console.error("Error al consultar DENUE:", err);
    return Response.json(
      { error: "No se pudieron cargar los negocios desde DENUE" },
      { status: 502 }
    );
  }
}
