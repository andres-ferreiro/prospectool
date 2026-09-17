"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/top-bar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { EditProjectDrawer } from "@/components/project-setup/edit-project-drawer";
import { CalendarAgenda } from "./calendar-agenda";
import { CalendarGrid } from "./calendar-grid";
import { CalendarWeekGrid } from "./calendar-week-grid";
import { CalendarDayList } from "./calendar-day-list";
import { CalendarClock } from "./calendar-clock";
import { AppointmentDrawer } from "./appointment-drawer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";
import { toast } from "@/lib/toast";
import { monthRange, weekRange, type DateRange } from "@/lib/calendar/date-range";
import { addDays, startOfWeek } from "@/lib/calendar/format";
import type { AppointmentStatus, AppointmentWithRelations, ProjectRow } from "@/lib/db/types";

type CalendarView = "month" | "week";

interface CalendarPageProps {
  projects: ProjectRow[];
  activeProject: ProjectRow;
  initialAppointments: AppointmentWithRelations[];
}

export function CalendarPage({ projects, activeProject, initialAppointments }: CalendarPageProps) {
  const router = useRouter();
  const user = useUser();
  const isDesktop = useIsDesktop();
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);

  const [appointments, setAppointments] = useState(initialAppointments);
  const [view, setView] = useState<CalendarView>("month");
  const [month, setMonth] = useState(() => new Date());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [loadingRange, setLoadingRange] = useState(false);

  const [drawerTarget, setDrawerTarget] = useState<"new" | string | null>(null);
  const [drawerDefaults, setDrawerDefaults] = useState<{ start?: Date } | undefined>(undefined);

  const loadRange = async (nextRange: DateRange, options?: { silent?: boolean }) => {
    if (!options?.silent) setLoadingRange(true);
    try {
      const params = new URLSearchParams({ projectId: activeProject.id, from: nextRange.from, to: nextRange.to });
      const res = await fetch(`/api/appointments?${params.toString()}`);
      const data = (await res.json()) as { appointments: AppointmentWithRelations[] };
      if (!res.ok) throw new Error("Error desconocido");
      setAppointments(data.appointments);
    } catch (err) {
      console.error("Error al cargar las citas:", err);
      // A silent background refresh keeps whatever is already on screen
      // rather than interrupting with an error the user didn't ask for.
      if (!options?.silent) toast({ title: "No se pudieron cargar las citas", variant: "error" });
    } finally {
      if (!options?.silent) setLoadingRange(false);
    }
  };

  // Re-fetches whatever range is on screen when the page opens or the tab
  // comes back — initialAppointments only seeds the state, so an
  // appointment added from another device stayed invisible until a reload.
  const visibleRange = view === "week" ? weekRange(weekStart) : monthRange(month);
  const { from: visibleFrom, to: visibleTo } = visibleRange;
  useRefreshOnFocus(
    useCallback(() => {
      void loadRange({ from: visibleFrom, to: visibleTo }, { silent: true });
      // loadRange is re-created every render but only closes over the
      // project id and setters, so the range strings are the real inputs.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleFrom, visibleTo])
  );

  const handleNavigateMonth = (delta: 1 | -1) => {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setMonth(next);
    loadRange(monthRange(next));
  };

  const handleNavigateWeek = (delta: 1 | -1) => {
    const next = addDays(weekStart, delta * 7);
    setWeekStart(next);
    loadRange(weekRange(next));
  };

  const handleChangeView = (next: CalendarView) => {
    setView(next);
    loadRange(next === "week" ? weekRange(weekStart) : monthRange(month));
  };

  const handleSaved = (appointment: AppointmentWithRelations) => {
    setAppointments((prev) => {
      const exists = prev.some((a) => a.id === appointment.id);
      const next = exists ? prev.map((a) => (a.id === appointment.id ? appointment : a)) : [...prev, appointment];
      return next.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
    });
  };

  const handleDeleted = (id: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  // Same PATCH the appointment drawer's own status buttons make — this is
  // just the swipe-quick-action shortcut for it (see AppointmentCard).
  const handleQuickStatusChange = async (id: string, status: AppointmentStatus) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const updated = (await res.json()) as AppointmentWithRelations;
      if (!res.ok) throw new Error("Error desconocido");
      handleSaved(updated);
    } catch (err) {
      console.error("Error al actualizar el estado:", err);
      toast({ title: "No se pudo actualizar el estado", variant: "error" });
    }
  };

  const openNew = (start: Date) => {
    setDrawerDefaults({ start });
    setDrawerTarget("new");
  };

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-sheet">
      <TopBar
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(id) => router.push(`/proyectos/${id}/calendario`)}
        onCreateProject={() => router.push(`/proyectos/${activeProject.id}`)}
        onEditProject={() => setEditDrawerOpen(true)}
        user={user}
        // This route only ever renders past its own server-side paywall
        // redirect (see app/proyectos/[id]/calendario/page.tsx).
        isPaid
      />

      <main
        className={
          isDesktop
            ? "mx-auto flex w-full min-h-0 flex-1 max-w-6xl flex-col overflow-y-auto overscroll-contain px-8 pt-20 pb-[calc(var(--bottom-nav-clearance)+1.5rem)]"
            : "mx-auto w-full min-h-0 flex-1 overflow-y-auto overscroll-contain max-w-2xl px-4 pt-20 pb-[calc(var(--bottom-nav-clearance)+1.5rem)]"
        }
      >
        {isDesktop ? (
          <TooltipProvider>
            <div className="flex min-h-0 flex-1 flex-col gap-6">
              <div className="flex items-start justify-between gap-4">
                <CalendarClock />
                <div className="flex items-center gap-1 rounded-full bg-muted p-1">
                  {(["month", "week"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleChangeView(v)}
                      aria-pressed={view === v}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-in-out",
                        view === v
                          ? "bg-background text-foreground shadow-soft"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {v === "month" ? "Mes" : "Semana"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex min-h-0 flex-1 items-stretch gap-8">
                <div
                  className={`min-w-0 flex-1 ${loadingRange ? "opacity-60 transition-opacity" : "transition-opacity"}`}
                >
                  {view === "month" ? (
                    <CalendarGrid
                      month={month}
                      appointments={appointments}
                      onSelectAppointment={(id) => setDrawerTarget(id)}
                      onSelectDay={(day) => openNew(day)}
                      onNavigateMonth={handleNavigateMonth}
                    />
                  ) : (
                    <CalendarWeekGrid
                      weekStart={weekStart}
                      appointments={appointments}
                      onSelectAppointment={(id) => setDrawerTarget(id)}
                      onSelectDay={(day) => openNew(day)}
                      onNavigateWeek={handleNavigateWeek}
                    />
                  )}
                </div>
                <div className="w-80 shrink-0 border-l border-border pl-6">
                  <CalendarDayList
                    appointments={appointments}
                    onSelectAppointment={(id) => setDrawerTarget(id)}
                    onNewAppointment={() => openNew(new Date())}
                    heading={view === "week" ? "Citas de la semana" : "Citas del mes"}
                  />
                </div>
              </div>
            </div>
          </TooltipProvider>
        ) : (
          <CalendarAgenda
            appointments={appointments}
            weekStart={weekStart}
            onSelectAppointment={(id) => setDrawerTarget(id)}
            onNewAppointment={openNew}
            onNavigateWeek={handleNavigateWeek}
            onStatusChange={handleQuickStatusChange}
          />
        )}
      </main>

      <BottomNav projectId={activeProject.id} active="calendar" />

      <AppointmentDrawer
        target={drawerTarget}
        projectId={activeProject.id}
        defaults={drawerDefaults}
        onOpenChange={(open) => !open && setDrawerTarget(null)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />

      <EditProjectDrawer
        open={editDrawerOpen}
        project={activeProject}
        onClose={() => setEditDrawerOpen(false)}
        onSaved={() => {
          setEditDrawerOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
