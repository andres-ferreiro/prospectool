"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowRight, Loader2, ThumbsDown } from "lucide-react";
import { STAGES, STAGE_COLORS, STAGE_LABELS, type LeadWithBusiness, type Stage } from "@/lib/db/types";
import { toTitleCase } from "@/lib/text";

const ACTION_WIDTH = 84;

interface LeadCardProps {
  lead: LeadWithBusiness;
  onOpen: (leadId: string) => void;
  onStageChange: (leadId: string, stage: Stage) => Promise<void>;
}

// The next stage forward in the pipeline — null once a lead is at a
// terminal stage (won/lost), since "advance" stops meaning anything there.
function nextStage(stage: Stage): Stage | null {
  if (stage === "won" || stage === "lost") return null;
  return STAGES[STAGES.indexOf(stage) + 1] ?? null;
}

// Swipeable, like business-list-row.tsx: the card is a horizontally
// draggable layer over up to two quick actions (advance to the next
// pipeline stage, mark lost) that only exist in the DOM once actually
// revealed — so there's no chance of their color showing through the
// card's rounded corners at rest. Advancing/marking lost this way is a
// shortcut for the same PATCH the stage dropdown in the full lead detail
// already makes; that dropdown remains the way to jump to any stage
// directly (e.g. skipping straight to "interested" from "contacted").
export function LeadCard({ lead, onOpen, onStageChange }: LeadCardProps) {
  const { business } = lead;
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [changingTo, setChangingTo] = useState<Stage | null>(null);
  const dragState = useRef<{ startX: number; startY: number; startOffset: number; axis: "x" | "y" | null } | null>(
    null
  );

  const next = nextStage(lead.stage);
  const showLostAction = lead.stage !== "lost";
  const actionCount = (next ? 1 : 0) + (showLostAction ? 1 : 0);
  const maxReveal = ACTION_WIDTH * actionCount;
  const close = () => setOffset(0);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "touch" || actionCount === 0) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, startOffset: offset, axis: null };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state) return;
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    if (state.axis === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
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

  const handleStageChange = async (stage: Stage) => {
    setChangingTo(stage);
    try {
      await onStageChange(lead.id, stage);
      close();
    } finally {
      setChangingTo(null);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {!!actionCount && (dragging || offset < 0) && (
        <div className="absolute inset-y-0 right-0 flex">
          {next && (
            <button
              type="button"
              onClick={() => handleStageChange(next)}
              disabled={changingTo !== null}
              style={{ width: ACTION_WIDTH, backgroundColor: STAGE_COLORS[next] }}
              className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-white"
            >
              {changingTo === next ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {STAGE_LABELS[next]}
            </button>
          )}
          {showLostAction && (
            <button
              type="button"
              onClick={() => handleStageChange("lost")}
              disabled={changingTo !== null}
              style={{ width: ACTION_WIDTH, backgroundColor: STAGE_COLORS.lost }}
              className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-white"
            >
              {changingTo === "lost" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ThumbsDown className="h-4 w-4" />
              )}
              {STAGE_LABELS.lost}
            </button>
          )}
        </div>
      )}

      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 200ms ease-out",
          touchAction: actionCount ? "pan-y" : undefined,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <button
          type="button"
          onClick={() => (offset === 0 ? onOpen(lead.id) : close())}
          className="flex w-full items-start gap-2.5 rounded-xl border border-border bg-card p-3 text-left transition-colors duration-150 ease-in-out hover:bg-muted"
        >
          <span
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: STAGE_COLORS[lead.stage] }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{toTitleCase(business.name)}</p>
            {business.address && (
              <p className="truncate text-xs text-muted-foreground">{toTitleCase(business.address)}</p>
            )}
            {lead.contacts[0] && (lead.contacts[0].name || lead.contacts[0].phone) && (
              <p className="truncate text-xs text-muted-foreground">
                {[lead.contacts[0].name, lead.contacts[0].phone].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
