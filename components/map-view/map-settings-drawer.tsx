"use client";

import { useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsDesktop } from "@/hooks/use-media-query";
import {
  STAGES,
  STAGE_COLORS,
  STAGE_LABELS,
  SAVED_COLOR,
  keywordColor,
  type Stage,
} from "@/lib/db/types";

export type LayerKey = "results" | "saved" | Stage;

interface AdvancedCategory {
  code: string;
  title: string;
}

interface MapSettingsDrawerProps {
  activeLayers: Set<LayerKey>;
  onToggleLayer: (key: LayerKey) => void;
  resultsCount: number;
  savedCount: number;
  stageCounts: Map<Stage, number>;
  keywords: string[];
  activeKeywords: Set<string>;
  onToggleKeyword: (keyword: string) => void;
  keywordCounts: Map<string, number>;
  /** SCIAN categories from the most recent advanced search — empty until
   *  one has run. */
  categories: AdvancedCategory[];
  activeCategories: Set<string>;
  onToggleCategory: (code: string) => void;
  categoryCounts: Map<string, number>;
}

// Matches business-map.tsx's ADVANCED_SEARCH_COLOR — the same indigo used
// for advanced-search pins/toggle (see search-progress-overlay.tsx for
// the same convention), so category rows read as part of the same visual
// thread.
const ADVANCED_SEARCH_COLOR = "#6366f1";

function Row({
  checked,
  color,
  label,
  count,
  onClick,
}: {
  checked: boolean;
  color: string;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150 ease-in-out hover:bg-muted"
    >
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
        style={{
          backgroundColor: checked ? color : "transparent",
          borderColor: checked ? "transparent" : "var(--color-input)",
        }}
        aria-hidden
      >
        {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{count}</span>
    </button>
  );
}

export function MapSettingsDrawer({
  activeLayers,
  onToggleLayer,
  resultsCount,
  savedCount,
  stageCounts,
  keywords,
  activeKeywords,
  onToggleKeyword,
  keywordCounts,
  categories,
  activeCategories,
  onToggleCategory,
  categoryCounts,
}: MapSettingsDrawerProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();

  const layerRows: { key: LayerKey; label: string; color: string; count: number }[] = [
    { key: "results", label: "Resultados de búsqueda", color: "var(--color-primary)", count: resultsCount },
    { key: "saved", label: "Guardados", color: SAVED_COLOR, count: savedCount },
    ...STAGES.map((stage) => ({
      key: stage as LayerKey,
      label: STAGE_LABELS[stage],
      color: STAGE_COLORS[stage],
      count: stageCounts.get(stage) ?? 0,
    })),
  ];

  return (
    <>
      {/* z-[60]: must outrank the results/detail drawers' z-50. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ajustes del mapa"
        className="absolute top-2.5 right-16 z-[60] flex h-9 w-9 items-center justify-center rounded-full bg-popover/95 shadow-soft backdrop-blur transition-colors duration-150 ease-in-out hover:bg-muted"
      >
        <SlidersHorizontal className="h-4 w-4 text-primary" />
      </button>

      <Drawer
        open={open}
        onOpenChange={setOpen}
        showSwipeHandle={!isDesktop}
        swipeDirection={isDesktop ? "right" : "down"}
      >
        <DrawerContent floating={isDesktop}>
          <DrawerHeader>
            <DrawerTitle>Ajustes del mapa</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-4 p-4 pt-0 pb-6">
            <div className="flex flex-col gap-1">
              <p className="px-3 text-xs font-medium text-muted-foreground">Capas</p>
              {layerRows.map((row) => (
                <Row
                  key={row.key}
                  checked={activeLayers.has(row.key)}
                  color={row.color}
                  label={row.label}
                  count={row.count}
                  onClick={() => onToggleLayer(row.key)}
                />
              ))}
            </div>

            {keywords.length > 1 && (
              <div className="flex flex-col gap-1 border-t border-border pt-3">
                <p className="px-3 text-xs font-medium text-muted-foreground">Palabras clave</p>
                {keywords.map((keyword, i) => (
                  <Row
                    key={keyword}
                    checked={activeKeywords.has(keyword)}
                    color={keywordColor(i)}
                    label={keyword}
                    count={keywordCounts.get(keyword) ?? 0}
                    onClick={() => onToggleKeyword(keyword)}
                  />
                ))}
              </div>
            )}

            {categories.length > 0 && (
              <div className="flex flex-col gap-1 border-t border-border pt-3">
                <p className="px-3 text-xs font-medium text-muted-foreground">Categorías (búsqueda avanzada)</p>
                {categories.map(({ code, title }) => (
                  <Row
                    key={code}
                    checked={activeCategories.has(code)}
                    color={ADVANCED_SEARCH_COLOR}
                    label={title}
                    count={categoryCounts.get(code) ?? 0}
                    onClick={() => onToggleCategory(code)}
                  />
                ))}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
