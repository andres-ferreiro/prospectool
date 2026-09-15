"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, Loader2, MapPin, X } from "lucide-react";
import { APPOINTMENT_STATUS_COLORS, type AppointmentStatus, type AppointmentWithRelations } from "@/lib/db/types";
import { timeLabel } from "@/lib/calendar/format";
import { toTitleCase } from "@/lib/text";

const ACTION_WIDTH = 84;

interface AppointmentCardProps {
  appointment: AppointmentWithRelations;
  onOpen: (id: string) => void;
  onStatusChange: (id: string, status: AppointmentStatus) => Promise<void>;
}

// Swipeable, same mechanics as lead-card.tsx: the card is a horizontally
// draggable layer over up to two quick actions (mark completed, cancel)
// that only exist in the DOM once actually revealed. This is a shortcut for
// the same PATCH the appointment drawer's status buttons already make.
export function AppointmentCard({ appointment, onOpen, onStatusChange }: AppointmentCardProps) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [changingTo, setChangingTo] = useState<AppointmentStatus | null>(null);
  const dragState = useRef<{ startX: number; startY: number; startOffset: number; axis: "x" | "y" | null } | null>(
    null
  );

  const showComplete = appointment.status !== "completed";
  const showCancel = appointment.status !== "cancelled";
  const actionCount = (showComplete ? 1 : 0) + (showCancel ? 1 : 0);
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

  const handleStatusChange = async (status: AppointmentStatus) => {
    setChangingTo(status);
    try {
      await onStatusChange(appointment.id, status);
      close();
    } finally {
      setChangingTo(null);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {!!actionCount && (dragging || offset < 0) && (
        <div className="absolute inset-y-0 right-0 flex">
          {showComplete && (
            <button
              type="button"
              onClick={() => handleStatusChange("completed")}
              disabled={changingTo !== null}
              style={{ width: ACTION_WIDTH, backgroundColor: APPOINTMENT_STATUS_COLORS.completed }}
              className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-white"
            >
              {changingTo === "completed" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Completada
            </button>
          )}
          {showCancel && (
            <button
              type="button"
              onClick={() => handleStatusChange("cancelled")}
              disabled={changingTo !== null}
              style={{ width: ACTION_WIDTH, backgroundColor: APPOINTMENT_STATUS_COLORS.cancelled }}
              className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-white"
            >
              {changingTo === "cancelled" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Cancelar
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
          onClick={() => (offset === 0 ? onOpen(appointment.id) : close())}
          className="flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-xs transition-colors hover:bg-muted"
        >
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: APPOINTMENT_STATUS_COLORS[appointment.status] }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{appointment.title}</p>
            <p className="text-xs text-muted-foreground">{timeLabel(new Date(appointment.start_at))}</p>
            {(appointment.business?.name || appointment.location) && (
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                {appointment.business?.name ? toTitleCase(appointment.business.name) : appointment.location}
              </p>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
