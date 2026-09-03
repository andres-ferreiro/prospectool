import type { NextRequest } from "next/server";
import { getBusinessById } from "@/lib/db/businesses";
import { findSiemMatchesForBusiness } from "@/lib/siem/match";

// Given a business (usually DENUE-sourced), look up likely-matching rows in
// the SIEM-dataset table — used by the business detail drawer to surface
// contact info DENUE is missing.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId")?.trim() ?? "";

  if (!businessId) {
    return Response.json({ error: "Falta el id del negocio" }, { status: 400 });
  }

  try {
    const business = await getBusinessById(businessId);
    if (!business) {
      return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    const matches = await findSiemMatchesForBusiness(business);
    return Response.json({ matches });
  } catch (err) {
    console.error("Error al buscar coincidencias en SIEM:", err);
    return Response.json({ error: "No se pudo consultar el dataset SIEM" }, { status: 500 });
  }
}
