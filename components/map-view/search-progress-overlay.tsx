"use client";

import { Loader2, Sparkles, Telescope, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Matches business-map.tsx's ADVANCED_SEARCH_COLOR — the same indigo used
// for advanced-search pins/toggle (see map-settings-drawer.tsx for the
// same convention).
const ACCENT = "#6366f1";

export interface AdvancedProgressState {
  running: boolean;
  completed: number;
  total: number;
  found: number;
  failed: number;
  currentTitles: string[];
}

interface SearchProgressOverlayProps {
  /** True while the regular keyword/radius search is loading. */
  keywordLoading: boolean;
  /** Advanced (SCIAN category) search state, or null before one has run. */
  advanced: AdvancedProgressState | null;
  collapsed: boolean;
  onDismiss: () => void;
  onExpand: () => void;
}

// Single glass-styled surface for both search mechanisms, so their cards
// never stack/overlap when both are active at once — most visibly right
// after the AI onboarding flow, when the regular keyword search and the
// AI-picked category search both kick off together. "Thinking" text uses
// a shimmer sweep (see .shimmer-text in globals.css) rather than a bare
// spinner, so it reads as active AI work in progress.
export function SearchProgressOverlay({
  keywordLoading,
  advanced,
  collapsed,
  onDismiss,
  onExpand,
}: SearchProgressOverlayProps) {
  if (!keywordLoading && !advanced) return null;

  if (collapsed && advanced) {
    return (
      <button
        type="button"
        onClick={onExpand}
        className="absolute top-20 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white shadow-soft"
        style={{ backgroundColor: ACCENT }}
      >
        {advanced.running ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Telescope className="h-3 w-3" />
        )}
        {advanced.running ? `${advanced.completed}/${advanced.total}` : `${advanced.found} encontrados`}
      </button>
    );
  }

  const pct = advanced && advanced.total > 0 ? Math.round((advanced.completed / advanced.total) * 100) : 0;
  const advancedSummary = advanced
    ? advanced.running
      ? `${advanced.completed}/${advanced.total} categorías · ${advanced.found} encontrados`
      : `Completa · ${advanced.found} encontrados${advanced.failed > 0 ? ` · ${advanced.failed} fallaron` : ""}`
    : "";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center px-6">
      <div
        className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border pt-14 pb-2.5 px-3 shadow-soft backdrop-blur-xl"
        style={{
          backgroundColor: "color-mix(in oklab, var(--color-popover) 55%, transparent)",
          borderColor: `${ACCENT}33`,
        }}
      >
        <div className="flex flex-col gap-2">
          {keywordLoading && (
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: ACCENT }} />
              <p className="shimmer-text min-w-0 flex-1 truncate text-xs font-medium">
                Buscando negocios cerca de ti…
              </p>
            </div>
          )}

          {advanced && (
            <div className="flex items-center gap-2">
              {advanced.running ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" style={{ color: ACCENT }} />
              ) : (
                <Telescope className="h-3.5 w-3.5 shrink-0" style={{ color: ACCENT }} />
              )}
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-xs font-medium text-foreground", advanced.running && "shimmer-text")}>
                  {advancedSummary}
                </p>
                {advanced.running && advanced.currentTitles.length > 0 && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    Buscando: {advanced.currentTitles.join(", ")}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Cerrar"
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {advanced && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-muted/60">
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${pct}%`, backgroundColor: ACCENT }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
