"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { APPOINTMENT_STATUS_COLORS, type AppointmentWithRelations } from "@/lib/db/types";
import { dayKey, isSameDay, statusChipStyle } from "@/lib/calendar/format";

interface CalendarGridProps {
  month: Date;
  appointments: AppointmentWithRelations[];
  onSelectAppointment: (id: string) => void;
  onSelectDay: (day: Date) => void;
  onNavigateMonth: (delta: 1 | -1) => void;
}

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MAX_CHIPS_PER_CELL = 3;

function buildMonthCells(month: Date): Date[] {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstOfMonth = new Date(year, m, 1);
  const start = new Date(year, m, 1 - ((firstOfMonth.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export function CalendarGrid({ month, appointments, onSelectAppointment, onSelectDay, onNavigateMonth }: CalendarGridProps) {
  const today = useMemo(() => new Date(), []);
  const cells = useMemo(() => buildMonthCells(month), [month]);

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentWithRelations[]>();
    for (const appt of appointments) {
      const key = dayKey(new Date(appt.start_at));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(appt);
    }
    return map;
  }, [appointments]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Mes anterior" onClick={() => onNavigateMonth(-1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Mes siguiente" onClick={() => onNavigateMonth(1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <h2 className="text-sm font-medium capitalize text-muted-foreground">
          {month.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}
        </h2>
      </div>

      {/* Bounded to the space actually available (see CalendarPage) so all
          six week rows always fit above the floating bottom nav instead of
          pushing the page taller — rows share the height equally and clip
          overflowing chips instead of growing or scrolling. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-7 gap-px bg-border">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="bg-card px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">
              {label}
            </div>
          ))}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-px bg-border">
          {cells.map((day) => {
            const key = dayKey(day);
            const items = byDay.get(key) ?? [];
            const inMonth = day.getMonth() === month.getMonth();
            const visible = items.slice(0, MAX_CHIPS_PER_CELL);
            const overflow = items.length - visible.length;

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectDay(day)}
                className={`flex min-h-0 flex-col items-stretch gap-1 overflow-hidden bg-card p-1.5 text-left transition-colors hover:bg-muted ${
                  inMonth ? "" : "opacity-40"
                }`}
              >
                <span
                  className={`self-start rounded-full px-1.5 text-xs font-medium ${
                    isSameDay(day, today) ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {day.getDate()}
                </span>
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
                            className="truncate rounded px-1 py-0.5 text-[0.7rem] font-medium"
                            style={statusChipStyle(APPOINTMENT_STATUS_COLORS[appt.status])}
                          />
                        }
                      >
                        {appt.title}
                      </TooltipTrigger>
                      <TooltipContent>{appt.title}</TooltipContent>
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
