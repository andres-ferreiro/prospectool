import type { NextRequest } from "next/server";
import { upsertBusinesses } from "@/lib/db/searches";
import { ENTIDADES } from "@/lib/inegi/entidades";
import { MUNICIPIOS } from "@/lib/inegi/municipios";
import { searchSiemByCode } from "@/lib/siem/match";

// Companion to /api/denue/search-by-code, same params (SCIAN class code +
// entidad/municipio codes) — looks up matching SIEM-dataset rows instead of
// calling DENUE. Dedup against whatever's already in `businesses` happens
// server-side in the siem_search_by_code SQL function, so every row
// returned here is upserted as new.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim() ?? "";
  const entidadCode = searchParams.get("entidad")?.trim() ?? "";
  const municipioCode = searchParams.get("municipio")?.trim() ?? "";

  if (!/^\d{6}$/.test(code)) {
    return Response.json({ error: "Código SCIAN inválido" }, { status: 400 });
  }
  if (!/^\d{2}$/.test(entidadCode)) {
    return Response.json({ error: "Entidad inválida" }, { status: 400 });
  }
  if (!/^\d{3}$/.test(municipioCode)) {
    return Response.json({ error: "Municipio inválido" }, { status: 400 });
  }

  const entidad = ENTIDADES.find((e) => e.code === entidadCode);
  const municipio = MUNICIPIOS.find((m) => m.entidadCode === entidadCode && m.municipioCode === municipioCode);
  if (!entidad || !municipio) {
    return Response.json({ error: "Entidad/municipio desconocido" }, { status: 400 });
  }

  try {
    const mapped = await searchSiemByCode([Number(code)], entidad.name, municipio.name);
    const businesses = await upsertBusinesses(mapped);
    return Response.json({ businesses });
  } catch (err) {
    console.error("Error al consultar SIEM:", err);
    return Response.json({ error: "No se pudieron cargar los negocios desde SIEM" }, { status: 502 });
  }
}
