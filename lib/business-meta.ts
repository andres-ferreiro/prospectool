import type { BusinessRow } from "./db/types";
import type { RawDenueRecord } from "./denue/types";
import type { SiemRow } from "./siem/types";

// Both sources carry a business category and an employee-count band, just
// under different keys in raw_json — this normalizes them for display.
export interface BusinessMeta {
  category: string | null;
  employees: string | null;
}

function cleanField(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "sin dato") return null;
  return trimmed;
}

export function getBusinessMeta(business: BusinessRow): BusinessMeta {
  if (business.source === "siem") {
    const raw = business.raw_json as Partial<SiemRow> | null;
    return { category: cleanField(raw?.giro), employees: cleanField(raw?.rango_empleados) };
  }
  const raw = business.raw_json as Partial<RawDenueRecord> | null;
  return { category: cleanField(raw?.Clase_actividad), employees: cleanField(raw?.Estrato) };
}
