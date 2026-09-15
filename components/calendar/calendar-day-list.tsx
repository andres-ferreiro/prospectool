"use client";

import { useMemo } from "react";
import { CalendarPlus, CalendarX, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { APPOINTMENT_STATUS_COLORS, type AppointmentWithRelations } from "@/lib/db/types";
import { dayKey, dayLabel, timeLabel } from "@/lib/calendar/format";
import { toTitleCase } from "@/lib/text";

interface CalendarDayListProps {
  appointments: AppointmentWithRelations[];
  onSelectAppointment: (id: string) => void;
  onNewAppointment: () => void;
  heading?: string;
}

// Right-hand rail next to the desktop month grid — every appointment
// currently loaded (the active month), grouped and ordered by day, so it
// reads as "what's coming up" alongside the grid rather than duplicating
// its navigation.
export function CalendarDayList({ appointments, onSelectAppointment, onNewAppointment, heading = "Citas del mes" }: CalendarDayListProps) {
  const today = useMemo(() => new Date(), []);

  const groups = useMemo(() => {
    const byDay = new Map<string, { date: Date; items: AppointmentWithRelations[] }>();
    for (const appt of appointments) {
      const start = new Date(appt.start_at);
      const key = dayKey(start);
      if (!byDay.has(key)) byDay.set(key, { date: start, items: [] });
      byDay.get(key)!.items.push(appt);
    }
    return Array.from(byDay.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [appointments]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{heading}</h3>
        <Button size="sm" className="gap-1.5" onClick={onNewAppointment}>
          <CalendarPlus className="h-3.5 w-3.5" />
          Nueva
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {groups.length === 0 ? (
          <EmptyState
            icon={CalendarX}
            size="sm"
            title="Sin citas este mes"
            description="Agenda una desde un lead, un negocio, o el botón de arriba."
          />
        ) : (
          <div className="flex flex-col gap-5">
            {groups.map(({ date, items }) => (
              <div key={dayKey(date)}>
                <p className="mb-2 text-xs font-medium text-muted-foreground">{dayLabel(date, today)}</p>
                <div className="flex flex-col gap-2">
                  {items.map((appt) => (
                    <button
                      key={appt.id}
                      type="button"
                      onClick={() => onSelectAppointment(appt.id)}
                      className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-2.5 text-left transition-colors hover:bg-muted"
                    >
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: APPOINTMENT_STATUS_COLORS[appt.status] }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <Tooltip>
                          <TooltipTrigger render={<p className="truncate text-sm font-medium" />}>
                            {appt.title}
                          </TooltipTrigger>
                          <TooltipContent>{appt.title}</TooltipContent>
                        </Tooltip>
                        <p className="text-xs text-muted-foreground">{timeLabel(new Date(appt.start_at))}</p>
                        {(appt.business?.name || appt.location) && (
                          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {appt.business?.name ? toTitleCase(appt.business.name) : appt.location}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
