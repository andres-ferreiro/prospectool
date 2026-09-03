import { Loader2, Telescope, X } from "lucide-react";

interface AdvancedSearchProgressProps {
  completed: number;
  total: number;
  found: number;
  failed: number;
  running: boolean;
  /** Titles of the categories currently being fetched — shown as "Buscando:
   *  X, Y" so this reads as active progress, not just a counter. */
  currentTitles: string[];
  onDismiss: () => void;
}

// Matches business-map.tsx's ADVANCED_SEARCH_COLOR — the same indigo used
// for advanced-search pins/toggle, so this banner reads as part of the same
// visual thread rather than another generic status message.
const ACCENT = "#6366f1";

// A non-blocking, dismissible progress banner — the advanced search runs in
// the background (see business-map.tsx's runAdvancedSearch), so the user
// can keep panning/searching/opening other drawers while this updates.
// Positioned to start at the same top offset as the search bar and sit
// behind it (lower z-index), with its content pushed below that bar's
// bottom edge — reads as the card sliding out from behind the search bar
// rather than stacking on top of it. Kept to a single compact row with the
// progress indicator as a thin strip flush along the bottom edge, rather
// than a separate padded bar + separate counts paragraph.
export function AdvancedSearchProgress({
  completed,
  total,
  found,
  failed,
  running,
  currentTitles,
  onDismiss,
}: AdvancedSearchProgressProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const summary = running
    ? `${completed}/${total} categorías · ${found} encontrados`
    : `Completa · ${found} encontrados${failed > 0 ? ` · ${failed} fallaron` : ""}`;
  const currentLabel = running && currentTitles.length > 0 ? `Buscando: ${currentTitles.join(", ")}` : null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center px-6">
      <div
        className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border pt-14 pb-2.5 px-3 shadow-soft backdrop-blur-xl"
        style={{ backgroundColor: "color-mix(in oklab, var(--color-popover) 55%, transparent)", borderColor: `${ACCENT}33` }}
      >
        <div className="flex items-center gap-2">
          {running ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" style={{ color: ACCENT }} />
          ) : (
            <Telescope className="h-3.5 w-3.5 shrink-0" style={{ color: ACCENT }} />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">{summary}</p>
            {currentLabel && (
              <p className="truncate text-[11px] text-muted-foreground">{currentLabel}</p>
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
        <div className="absolute inset-x-0 bottom-0 h-1 bg-muted/60">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: ACCENT }}
          />
        </div>
      </div>
    </div>
  );
}
