"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { APPOINTMENT_STATUS_COLORS, type AppointmentWithRelations } from "@/lib/db/types";
import { addDays, dayKey, isSameDay, startOfWeek, statusChipStyle, timeLabel } from "@/lib/calendar/format";

interface CalendarWeekGridProps {
  weekStart: Date;
  appointments: AppointmentWithRelations[];
  onSelectAppointment: (id: string) => void;
  onSelectDay: (day: Date) => void;
  onNavigateWeek: (delta: 1 | -1) => void;
}

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MAX_CHIPS_PER_CELL = 8;

function formatWeekLabel(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = start.toLocaleDateString("es-MX", { day: "numeric", month: sameMonth ? undefined : "short" });
  const endLabel = end.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

// A single-row variant of CalendarGrid — same cell/chip language (so
// switching views doesn't feel like a different app), but a full week's
// worth of vertical room per day means chips can show a time, not just a
// title, and rarely need the "+N más" overflow month view relies on.
export function CalendarWeekGrid({ weekStart, appointments, onSelectAppointment, onSelectDay, onNavigateWeek }: CalendarWeekGridProps) {
  const today = useMemo(() => new Date(), []);
  const monday = useMemo(() => startOfWeek(weekStart), [weekStart]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday]);

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentWithRelations[]>();
    for (const appt of appointments) {
      const key = dayKey(new Date(appt.start_at));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(appt);
    }
    for (const items of map.values()) {
      items.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
    }
    return map;
  }, [appointments]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Semana anterior" onClick={() => onNavigateWeek(-1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Semana siguiente" onClick={() => onNavigateWeek(1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <h2 className="text-sm font-medium capitalize text-muted-foreground">
          {formatWeekLabel(days[0]!, days[6]!)}
        </h2>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-7 gap-px bg-border">
          {days.map((day, i) => (
            <div key={dayKey(day)} className="flex flex-col items-center gap-0.5 bg-card px-2 py-1.5 text-center">
              <span className="text-xs font-medium text-muted-foreground">{WEEKDAY_LABELS[i]}</span>
              <span
                className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isSameDay(day, today) ? "bg-primary text-primary-foreground" : "text-foreground"
                }`}
              >
                {day.getDate()}
              </span>
            </div>
          ))}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-7 gap-px bg-border">
          {days.map((day) => {
            const key = dayKey(day);
            const items = byDay.get(key) ?? [];
            const visible = items.slice(0, MAX_CHIPS_PER_CELL);
            const overflow = items.length - visible.length;

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectDay(day)}
                className="flex min-h-0 flex-col items-stretch gap-1 overflow-hidden bg-card p-1.5 text-left transition-colors hover:bg-muted"
              >
                <div className="flex min-h-0 flex-col gap-1 overflow-hidden">
                  {visible.map((appt) => (
                    <Tooltip key={appt.id}>
                      <TooltipTrigger
                        render={
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAppointment(appt.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.stopPropagation();
                                onSelectAppointment(appt.id);
                              }
                            }}
                            className="flex flex-col truncate rounded px-1 py-0.5 text-[0.7rem] leading-tight font-medium"
                            style={statusChipStyle(APPOINTMENT_STATUS_COLORS[appt.status])}
                          />
                        }
                      >
                        <span className="opacity-70">{timeLabel(new Date(appt.start_at))}</span>
                        <span className="truncate">{appt.title}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {timeLabel(new Date(appt.start_at))} · {appt.title}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {overflow > 0 && <span className="px-1 text-[0.7rem] text-muted-foreground">+{overflow} más</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
