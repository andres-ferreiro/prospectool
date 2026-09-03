"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Bookmark, BookmarkCheck, CheckCircle2, Loader2 } from "lucide-react";
import { SAVED_COLOR, STAGE_COLORS, type BusinessRow } from "@/lib/db/types";
import { toTitleCase } from "@/lib/text";
import { toast } from "@/lib/toast";
import { useIsDesktop } from "@/hooks/use-media-query";

// Matches business-map.tsx's ADVANCED_SEARCH_COLOR.
const ADVANCED_SEARCH_COLOR = "#6366f1";
// A distinct hue from every other status dot, so SIEM-sourced rows (no
// coordinates, richer contact info) read as a different source at a glance.
const SIEM_SOURCE_COLOR = "#0ea5e9";
const ACTION_WIDTH = 72;

interface BusinessListRowProps {
  business: BusinessRow;
  advanced: boolean;
  saved: boolean;
  hasLead: boolean;
  onSelect: (business: BusinessRow) => void;
  onToggleSave: (business: BusinessRow) => Promise<void>;
  onMarkVisited: (business: BusinessRow) => Promise<void>;
}

// The row itself is a horizontally-draggable layer sitting on top of two
// action buttons (mark contacted, save) that are always in the DOM but
// only reachable once the row is swiped left far enough to reveal them —
// the native-app "swipe actions" pattern. Desktop has no touch gestures to
// swipe with, so there it's a plain row plus the persistent save button
// instead; mobile gets both.
export function BusinessListRow({
  business,
  advanced,
  saved,
  hasLead,
  onSelect,
  onToggleSave,
  onMarkVisited,
}: BusinessListRowProps) {
  const isDesktop = useIsDesktop();
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const [markingVisited, setMarkingVisited] = useState(false);
  const dragState = useRef<{ startX: number; startY: number; startOffset: number; axis: "x" | "y" | null } | null>(
    null
  );

  const maxReveal = hasLead ? ACTION_WIDTH : ACTION_WIDTH * 2;
  const close = () => setOffset(0);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Touch only — this is the native-app "swipe to reveal actions"
    // gesture, not something a mouse/trackpad pointer should trigger (an
    // ordinary mouse move can easily drift past the drag threshold below).
    if (e.pointerType !== "touch") return;
    dragState.current = { startX: e.clientX, startY: e.clientY, startOffset: offset, axis: null };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state) return;
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    if (state.axis === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      // Decide once, on the first meaningful movement, whether this is a
      // horizontal swipe (we drive it) or a vertical scroll (let the page
      // handle it) — never both at once.
      state.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (state.axis === "x") {
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    }
    if (state.axis !== "x") return;
    e.preventDefault();
    setOffset(Math.min(0, Math.max(-maxReveal, state.startOffset + dx)));
  };

  const endDrag = () => {
    const state = dragState.current;
    dragState.current = null;
    setDragging(false);
    if (!state || state.axis !== "x") return;
    setOffset((current) => (current < -maxReveal / 2 ? -maxReveal : 0));
  };

  const handleToggleSave = async () => {
    setSavingToggle(true);
    try {
      await onToggleSave(business);
      close();
    } catch (err) {
      console.error("Error al guardar:", err);
      toast({ title: "No se pudo actualizar guardados", variant: "error" });
    } finally {
      setSavingToggle(false);
    }
  };

  const handleMarkVisited = async () => {
    setMarkingVisited(true);
    try {
      await onMarkVisited(business);
      toast({ title: "Agregado a tu CRM", variant: "success" });
      close();
    } catch (err) {
      console.error("Error al marcar como visitado:", err);
      toast({ title: "No se pudo marcar como visitado", variant: "error" });
    } finally {
      setMarkingVisited(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Only in the DOM while actually reachable (dragging, or revealed) —
          not just hidden at rest, but genuinely absent — so there's no
          possibility of the action colors showing through the row's
          rounded corners while closed. */}
      {!isDesktop && (dragging || offset < 0) && (
        <div className="absolute inset-y-0 right-0 flex">
          {!hasLead && (
            <button
              type="button"
              onClick={handleMarkVisited}
              disabled={markingVisited}
              style={{ width: ACTION_WIDTH, backgroundColor: STAGE_COLORS.contacted }}
              className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-white"
            >
              {markingVisited ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Contactado
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleSave}
            disabled={savingToggle}
            style={{ width: ACTION_WIDTH, backgroundColor: SAVED_COLOR }}
            className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-white"
          >
            {savingToggle ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
            {saved ? "Guardado" : "Guardar"}
          </button>
        </div>
      )}

      <div
        className="relative flex items-start gap-1 bg-popover"
        style={
          isDesktop
            ? undefined
            : {
                transform: `translateX(${offset}px)`,
                transition: dragging ? "none" : "transform 200ms ease-out",
                // Without this, the browser can claim the gesture for its
                // own vertical scroll on the very first touchmove — before
                // our JS gets a chance to see it's actually horizontal —
                // which is what made the swipe feel unresponsive/hard to
                // trigger. This tells it upfront: vertical panning is
                // yours, horizontal is ours.
                touchAction: "pan-y",
              }
        }
        onPointerDown={isDesktop ? undefined : handlePointerDown}
        onPointerMove={isDesktop ? undefined : handlePointerMove}
        onPointerUp={isDesktop ? undefined : endDrag}
        onPointerCancel={isDesktop ? undefined : endDrag}
      >
        <button
          type="button"
          onClick={() => (offset === 0 ? onSelect(business) : close())}
          className="flex min-w-0 flex-1 items-start gap-2 rounded-lg px-2 py-2.5 text-left transition-colors duration-150 ease-in-out hover:bg-muted"
        >
          {advanced && (
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: ADVANCED_SEARCH_COLOR }}
              aria-hidden
            />
          )}
          {business.source === "siem" && (
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: SIEM_SOURCE_COLOR }}
              aria-hidden
              title="SIEM"
            />
          )}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-medium">{toTitleCase(business.name)}</span>
            {business.address && (
              <span className="text-xs text-muted-foreground">{toTitleCase(business.address)}</span>
            )}
          </span>
        </button>
        {/* Desktop only — on mobile, swiping the row reveals the same save
            action, so a second always-visible icon would be redundant. */}
        {isDesktop && (
          <button
            type="button"
            onClick={handleToggleSave}
            disabled={savingToggle}
            aria-label={saved ? "Quitar de guardados" : "Guardar para más tarde"}
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {savingToggle ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <BookmarkCheck className="h-4 w-4 text-primary" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
