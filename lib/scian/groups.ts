import { SCIAN_CATALOG } from "./catalog";

// Accent/case-insensitive substring match, so "cafe" still finds "Cafeterías".
export function normalizeSpanish(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Sector → Subsector → Clase[] hierarchy, used by the standalone
// advanced-search category tree (components/map-view/advanced-category-
// tree.tsx). The project keyword picker uses a fixed pill list instead
// (lib/scian/quick-picks.ts) — precision beyond those pills is Advanced
// Search's job, not a second catalog browser here.
export interface ScianSubsectorGroup {
  subsector: string;
  clases: { code: string; title: string }[];
}
export interface ScianSectorGroup {
  sector: string;
  subsectors: ScianSubsectorGroup[];
}

export const SCIAN_TREE: ScianSectorGroup[] = (() => {
  const bySector = new Map<string, Map<string, { code: string; title: string }[]>>();
  for (const item of SCIAN_CATALOG) {
    let bySubsector = bySector.get(item.sector);
    if (!bySubsector) {
      bySubsector = new Map();
      bySector.set(item.sector, bySubsector);
    }
    const clases = bySubsector.get(item.subsector) ?? [];
    clases.push({ code: item.code, title: item.title });
    bySubsector.set(item.subsector, clases);
  }
  return Array.from(bySector.entries()).map(([sector, bySubsector]) => ({
    sector,
    subsectors: Array.from(bySubsector.entries()).map(([subsector, clases]) => ({
      subsector,
      clases,
    })),
  }));
})();
