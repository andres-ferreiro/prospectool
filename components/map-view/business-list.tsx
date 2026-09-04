"use client";

import { useMemo, useState } from "react";
import { Mail, Phone, Globe, Search, Telescope } from "lucide-react";
import { DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { normalizeSpanish } from "@/lib/scian/groups";
import type { BusinessRow, LeadRow } from "@/lib/db/types";
import { BusinessListRow } from "./business-list-row";

export type FilterKey = "phone" | "email" | "website" | "advanced";

export const BUSINESS_FILTERS: { key: FilterKey; label: string; icon: typeof Phone }[] = [
  { key: "phone", label: "Con teléfono", icon: Phone },
  { key: "email", label: "Con correo", icon: Mail },
  { key: "website", label: "Con sitio web", icon: Globe },
];

// Matches business-list-row.tsx's ADVANCED_SEARCH_COLOR.
const ADVANCED_SEARCH_COLOR = "#6366f1";

interface BusinessListProps {
  businesses: BusinessRow[];
  activeFilters: Set<FilterKey>;
  onToggleFilter: (key: FilterKey) => void;
  onSelect: (business: BusinessRow) => void;
  savedIds: Set<string>;
  leadsByBusinessId: Map<string, LeadRow>;
  onToggleSave: (business: BusinessRow) => Promise<void>;
  onMarkVisited: (business: BusinessRow) => Promise<void>;
  /** Ids found via the standalone advanced (SCIAN code) search — lets the
   *  list filter to just those, and marks each row so both result sets stay
   *  visually distinguishable even when shown together. */
  advancedIds?: Set<string>;
}

export function BusinessList({
  businesses,
  activeFilters,
  onToggleFilter,
  onSelect,
  savedIds,
  leadsByBusinessId,
  onToggleSave,
  onMarkVisited,
  advancedIds,
}: BusinessListProps) {
  const [query, setQuery] = useState("");

  const filters = useMemo(
    () =>
      advancedIds && advancedIds.size > 0
        ? [{ key: "advanced" as FilterKey, label: "Avanzada", icon: Telescope }, ...BUSINESS_FILTERS]
        : BUSINESS_FILTERS,
    [advancedIds]
  );

  const visible = useMemo(() => {
    const q = normalizeSpanish(query.trim());
    return businesses.filter((b) => {
      if (q && !normalizeSpanish(b.name).includes(q)) return false;
      return Array.from(activeFilters).every((key) =>
        key === "advanced" ? (advancedIds?.has(b.id) ?? false) : Boolean(b[key])
      );
    });
  }, [businesses, activeFilters, advancedIds, query]);

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>
          {activeFilters.size > 0 || query
            ? `${visible.length} de ${businesses.length} resultados`
            : `${businesses.length} ${businesses.length === 1 ? "resultado" : "resultados"}`}
        </DrawerTitle>
      </DrawerHeader>

      <div className="px-4 pb-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre..."
            className="h-10 pl-9"
          />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto px-4 pb-1 pt-2">
        {filters.map(({ key, label, icon: Icon }) => {
          const active = activeFilters.has(key);
          const isAdvanced = key === "advanced";
          return (
            <Button
              key={key}
              type="button"
              variant={active ? "default" : "outline"}
              size="sm"
              className="shrink-0 gap-1.5 rounded-full"
              style={isAdvanced && active ? { backgroundColor: ADVANCED_SEARCH_COLOR } : undefined}
              onClick={() => onToggleFilter(key)}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Button>
          );
        })}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-1.5 p-2">
          {visible.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {query ? "Ningún resultado coincide con la búsqueda." : "Ningún resultado coincide con los filtros."}
            </p>
          )}
          {visible.map((business) => (
            <BusinessListRow
              key={business.id}
              business={business}
              advanced={advancedIds?.has(business.id) ?? false}
              saved={savedIds.has(business.id)}
              hasLead={leadsByBusinessId.has(business.id)}
              onSelect={onSelect}
              onToggleSave={onToggleSave}
              onMarkVisited={onMarkVisited}
            />
          ))}
        </div>
      </ScrollArea>
    </>
  );
}
