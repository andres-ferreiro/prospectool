import type { NextRequest } from "next/server";
import { fillMissingContactInfo } from "@/lib/db/businesses";

// Used by the SIEM enrichment card in the business detail drawer to fill in
// a missing email/phone found in SIEM-dataset.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const phone = typeof body?.phone === "string" ? body.phone : undefined;
  const email = typeof body?.email === "string" ? body.email : undefined;

  if (phone === undefined && email === undefined) {
    return Response.json({ error: "Nada para actualizar" }, { status: 400 });
  }

  try {
    const business = await fillMissingContactInfo(id, { phone, email });
    return Response.json({ business });
  } catch (err) {
    console.error("Error al actualizar el negocio:", err);
    return Response.json({ error: "No se pudo actualizar el negocio" }, { status: 500 });
  }
}
