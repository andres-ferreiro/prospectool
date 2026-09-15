"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CalendarPlus, CalendarX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { AppointmentCard } from "./appointment-card";
import type { AppointmentStatus, AppointmentWithRelations } from "@/lib/db/types";
import { addDays, dayKey, dayLabel, isSameDay, startOfWeek } from "@/lib/calendar/format";
import { toTitleCase } from "@/lib/text";

interface CalendarAgendaProps {
  appointments: AppointmentWithRelations[];
  weekStart: Date;
  onSelectAppointment: (id: string) => void;
  onNewAppointment: (start: Date) => void;
  onNavigateWeek: (delta: 1 | -1) => void;
  onStatusChange: (id: string, status: AppointmentStatus) => Promise<void>;
}

// Monday-first week strip — matches the desktop month grid's ISO-ish weekday
// order and how most users here think about a work week.
function buildWeekStrip(weekStart: Date): Date[] {
  const monday = startOfWeek(weekStart);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

// A swipe purely as a directional gesture (not a followed drag) — the strip
// itself doesn't need to visually track the finger, it just needs to know
// "left" or "right" happened, so this stays a plain threshold check rather
// than the axis-locked drag state AppointmentCard's swipe-to-reveal needs.
const WEEK_SWIPE_THRESHOLD = 40;

export function CalendarAgenda({
  appointments,
  weekStart,
  onSelectAppointment,
  onNewAppointment,
  onNavigateWeek,
  onStatusChange,
}: CalendarAgendaProps) {
  const today = useMemo(() => new Date(), []);
  const weekStrip = useMemo(() => buildWeekStrip(weekStart), [weekStart]);
  const [selectedDate, setSelectedDate] = useState(today);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  // Keep the selected day valid as the visible week changes — jump to that
  // week's Monday rather than leaving a day selected that's no longer shown.
  useEffect(() => {
    if (!weekStrip.some((d) => isSameDay(d, selectedDate))) setSelectedDate(weekStrip[0]!);
  }, [weekStrip, selectedDate]);

  const handleStripPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "touch") return;
    swipeStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleStripPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < WEEK_SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    onNavigateWeek(dx < 0 ? 1 : -1);
  };

  const appointmentDays = useMemo(() => new Set(appointments.map((a) => dayKey(new Date(a.start_at)))), [appointments]);

  const dayAppointments = useMemo(
    () =>
      appointments
        .filter((a) => isSameDay(new Date(a.start_at), selectedDate))
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()),
    [appointments, selectedDate]
  );

  return (
    <div className="flex flex-col gap-5">
      <div
        className="grid grid-cols-7"
        style={{ touchAction: "pan-y" }}
        onPointerDown={handleStripPointerDown}
        onPointerUp={handleStripPointerUp}
        onPointerCancel={() => (swipeStart.current = null)}
      >
        {weekStrip.map((d) => {
          const key = dayKey(d);
          const selected = isSameDay(d, selectedDate);
          const isToday = isSameDay(d, today);
          const hasAppointments = appointmentDays.has(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDate(d)}
              className={`flex flex-col items-center gap-2 rounded-2xl py-2 transition-colors ${
                selected ? "bg-card shadow-sm" : ""
              }`}
            >
              <span className={`text-xs font-medium ${selected ? "text-foreground" : "text-muted-foreground"}`}>
                {toTitleCase(d.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", ""))}
              </span>
              <span
                className={`flex size-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  selected
                    ? "bg-primary text-primary-foreground"
                    : isToday
                      ? "border border-border bg-muted text-foreground"
                      : hasAppointments
                        ? "border border-border text-foreground"
                        : "border border-dashed border-border text-muted-foreground"
                }`}
              >
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">{dayLabel(selectedDate, today)}</p>

        {dayAppointments.length === 0 ? (
          <EmptyState
            icon={CalendarX}
            title="Sin citas este día"
            description="Toca el botón de abajo para agendar una."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {dayAppointments.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                onOpen={onSelectAppointment}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating above BottomNav (same right edge, same bottom offset) —
          the pill nav is centered so there's no horizontal overlap. Defaults
          to 9am on whichever day is selected, not always "now". */}
      <button
        type="button"
        aria-label="Nueva cita"
        onClick={() => {
          const start = new Date(selectedDate);
          start.setHours(9, 0, 0, 0);
          onNewAppointment(start);
        }}
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition-transform duration-150 hover:scale-105 active:scale-95"
      >
        <CalendarPlus className="h-6 w-6" />
      </button>
    </div>
  );
}
