"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mail, Phone, Globe, Lock, Search, SearchX, Telescope } from "lucide-react";
import { DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { openPaywall } from "@/lib/paywall";
import { lockedResultStats } from "@/lib/billing/limits";
import { normalizeSpanish } from "@/lib/scian/groups";
import { toTitleCase } from "@/lib/text";
import type { BusinessRow, LeadRow } from "@/lib/db/types";
import { BusinessListRow } from "./business-list-row";

export type FilterKey = "phone" | "email" | "website" | "advanced";

export const BUSINESS_FILTERS: { key: FilterKey; label: string; icon: typeof Phone }[] = [
  { key: "phone", label: "Con teléfono", icon: Phone },
  { key: "email", label: "Con correo", icon: Mail },
  { key: "website", label: "Con sitio web", icon: Globe },
];

// Rows rendered per batch. A municipio-wide category search returns
// thousands of businesses, and every row is real DOM (contact icons, save
// and visit buttons) — rendering them all at once made opening the drawer
// and typing in its search box visibly janky. More are appended as the
// sentinel below scrolls into view, so scrolling stays continuous and no
// pagination controls are needed.
const RENDER_BATCH = 40;
// Appends the next batch before the sentinel is actually on screen, so the
// list is already filled by the time the user reaches the bottom.
const RENDER_AHEAD_PX = 600;

// Matches business-list-row.tsx's ADVANCED_SEARCH_COLOR.
const ADVANCED_SEARCH_COLOR = "#6366f1";
// How many locked results to preview (blurred, faded) before the paywall
// CTA — enough to look like a real continuing list, not so many that
// masking them individually (see business-list-row.tsx's old approach)
// would be needed instead of one gradient.
const LOCKED_PREVIEW_COUNT = 2;

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
  /** Free-tier results beyond the visible limit — excluded from the normal
   *  row list; a couple are shown faded under a gradient instead, as proof
   *  more results exist, with an upgrade CTA. See lib/billing/limits.ts's
   *  selectUnlockedIds. */
  lockedIds?: Set<string>;
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
  lockedIds,
}: BusinessListProps) {
  const [query, setQuery] = useState("");
  const isFiltering = activeFilters.size > 0 || query.trim().length > 0;

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

  // Locked results never render as normal rows, filtered or not — only as
  // the faded preview below, and only against the unfiltered set (a
  // filtered view showing "12 more" against the wrong denominator would be
  // confusing, and a locked business's real field values aren't known to
  // match the filter anyway since that's exactly what's hidden).
  const unlockedVisible = useMemo(
    () => visible.filter((b) => !lockedIds?.has(b.id)),
    [visible, lockedIds]
  );
  const lockedPreview = useMemo(() => {
    if (isFiltering || !lockedIds || lockedIds.size === 0) return [];
    return businesses.filter((b) => lockedIds.has(b.id)).slice(0, LOCKED_PREVIEW_COUNT);
  }, [businesses, lockedIds, isFiltering]);

  const stats = useMemo(
    () => (lockedIds ? lockedResultStats(businesses, lockedIds) : null),
    [businesses, lockedIds]
  );

  // Start over at the top only when the user changes what they're looking
  // at (a query or filter change), not when results merely stream in from a
  // running search — that would yank a reader back to the first batch every
  // time another category resolved. Adjusted during render, the same
  // pattern results-drawer.tsx uses for its filters.
  const viewSignature = `${query.trim()}|${Array.from(activeFilters).sort().join(",")}`;
  const [renderCount, setRenderCount] = useState(RENDER_BATCH);
  const [prevSignature, setPrevSignature] = useState(viewSignature);
  if (viewSignature !== prevSignature) {
    setPrevSignature(viewSignature);
    setRenderCount(RENDER_BATCH);
  }

  const renderedRows = useMemo(
    () => unlockedVisible.slice(0, renderCount),
    [unlockedVisible, renderCount]
  );
  const hasMoreRows = renderCount < unlockedVisible.length;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!hasMoreRows || !sentinel) return;
    // Default root: the ScrollArea's own clipping still applies, so a
    // sentinel scrolled out of the drawer correctly reads as off-screen.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setRenderCount((count) => count + RENDER_BATCH);
      },
      { rootMargin: `${RENDER_AHEAD_PX}px` }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreRows, renderCount]);

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
          {unlockedVisible.length === 0 && lockedPreview.length === 0 && (
            <EmptyState
              size="sm"
              icon={SearchX}
              title={query ? "Ningún resultado coincide con la búsqueda" : "Ningún resultado coincide con los filtros"}
            />
          )}
          {renderedRows.map((business) => (
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

          {hasMoreRows && (
            <div ref={sentinelRef} className="py-3 text-center text-xs text-muted-foreground">
              Mostrando {renderedRows.length} de {unlockedVisible.length}…
            </div>
          )}

          {lockedPreview.length > 0 && (
            <div className="relative mt-1 overflow-hidden rounded-lg">
              <div aria-hidden className="pointer-events-none flex select-none flex-col gap-1.5 opacity-70 blur-[3px]">
                {lockedPreview.map((business) => (
                  <div key={business.id} className="flex items-start gap-2 rounded-lg bg-popover px-2 py-2.5">
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-sm font-medium">{toTitleCase(business.name)}</span>
                      {business.address && (
                        <span className="text-xs text-muted-foreground">{toTitleCase(business.address)}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-sheet/80 to-sheet" />
              <button
                type="button"
                onClick={() => openPaywall("resultados", stats)}
                className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-0.5 pb-3 pt-6"
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Lock className="h-3.5 w-3.5" aria-hidden />
                  +{lockedIds?.size ?? 0} {lockedIds?.size === 1 ? "negocio más" : "negocios más"}
                </span>
                <span className="text-xs text-muted-foreground underline underline-offset-2">
                  Desbloquear gratis
                </span>
              </button>
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  );
}
