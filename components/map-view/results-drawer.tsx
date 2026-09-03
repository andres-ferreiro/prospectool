"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { BusinessList, type FilterKey } from "./business-list";
import { BusinessDetail } from "./business-detail";
import { useIsDesktop } from "@/hooks/use-media-query";
import type { BusinessRow, LeadRow } from "@/lib/db/types";

interface ResultsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businesses: BusinessRow[];
  selected: BusinessRow | null;
  onSelect: (business: BusinessRow | null) => void;
  userLocation: { lat: number; lng: number };
  leadsByBusinessId: Map<string, LeadRow>;
  savedIds: Set<string>;
  onMarkVisited: (business: BusinessRow) => Promise<void>;
  onToggleSave: (business: BusinessRow) => Promise<void>;
  onLeadUpdated: (lead: LeadRow) => void;
  onBusinessUpdated: (business: BusinessRow) => void;
  advancedIds?: Set<string>;
}

export function ResultsDrawer({
  open,
  onOpenChange,
  businesses,
  selected,
  onSelect,
  userLocation,
  leadsByBusinessId,
  savedIds,
  onMarkVisited,
  onToggleSave,
  onLeadUpdated,
  onBusinessUpdated,
  advancedIds,
}: ResultsDrawerProps) {
  // Lives here (not in BusinessList) so it survives switching to the detail
  // view and back — BusinessList unmounts while a business is selected.
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());

  // Only reset when the result set itself changes (a new search), not when
  // toggling between the list and detail views. Adjusted during render
  // (React's documented pattern for this) rather than in an effect, so it
  // takes effect in the same render instead of flashing stale filters first.
  const [prevBusinesses, setPrevBusinesses] = useState(businesses);
  if (businesses !== prevBusinesses) {
    setPrevBusinesses(businesses);
    setActiveFilters(new Set());
  }

  const toggleFilter = (key: FilterKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Desktop (lg+): floats on the left, full-height, map fills the rest.
  // Below that: the usual bottom sheet. See docs/superpowers/specs/
  // 2026-09-02-desktop-layout-design.md.
  const isDesktop = useIsDesktop();

  // Same three-state sizing rule on both breakpoints: the list and the
  // full CRM form need a tall, fixed box to scroll within; the read-only
  // detail view (no lead yet) has little content, so it stays
  // content-sized instead of stretching a mostly-empty card to fill the
  // viewport — that reads as broken, especially floating next to a tall
  // map on desktop.
  const hasLead = !!selected && leadsByBusinessId.has(selected.id);
  const sizeClassName = isDesktop
    ? !selected || hasLead
      ? "h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)]"
      : // The x-axis base styles pin both top and bottom (full-bleed height);
        // releasing bottom here is what lets this state shrink to its
        // (short) content instead of stretching to fill the viewport.
        "!bottom-auto max-h-[calc(100dvh-2rem)]"
    : !selected
      ? "h-[85dvh] max-h-[85dvh]"
      : hasLead
        ? "h-[88dvh] max-h-[88dvh]"
        : "max-h-[70dvh]";

  return (
    <div className="contents">
      <Drawer
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (!next) onSelect(null);
        }}
        modal={false}
        disablePointerDismissal
        showSwipeHandle={!isDesktop}
        swipeDirection={isDesktop ? "left" : "down"}
      >
        <DrawerContent floating={isDesktop} className={sizeClassName}>
          {selected ? (
            <BusinessDetail
              business={selected}
              userLocation={userLocation}
              onBack={() => onSelect(null)}
              lead={leadsByBusinessId.get(selected.id) ?? null}
              saved={savedIds.has(selected.id)}
              onMarkVisited={onMarkVisited}
              onToggleSave={onToggleSave}
              onLeadUpdated={onLeadUpdated}
              onBusinessUpdated={onBusinessUpdated}
            />
          ) : (
            <BusinessList
              businesses={businesses}
              activeFilters={activeFilters}
              onToggleFilter={toggleFilter}
              onSelect={onSelect}
              savedIds={savedIds}
              leadsByBusinessId={leadsByBusinessId}
              onToggleSave={onToggleSave}
              onMarkVisited={onMarkVisited}
              advancedIds={advancedIds}
            />
          )}
        </DrawerContent>
      </Drawer>

      {/* Desktop only — the panel is non-modal with no swipe handle (it
          floats beside the map rather than over it), so without this
          there'd be no way to close it and see the map fullscreen. Anchored
          near the top rather than vertically centered on the viewport,
          since the panel's own height varies a lot between states (a short
          read-only detail card vs. the full-height list/CRM form) and a
          viewport-centered button would float disconnected below a short
          card. */}
      {isDesktop && open && (
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Cerrar panel de resultados"
          className="fixed top-8 left-[27rem] z-[60] flex h-8 w-8 items-center justify-center rounded-full bg-popover/95 shadow-soft backdrop-blur transition-colors duration-150 ease-in-out hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4 text-primary" />
        </button>
      )}
    </div>
  );
}
