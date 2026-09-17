"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/top-bar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { EditProjectDrawer } from "@/components/project-setup/edit-project-drawer";
import { CrmBoard } from "./crm-board";
import { KanbanBoard } from "./kanban-board";
import { LeadFunnel } from "./lead-funnel";
import { useUser } from "@/hooks/use-user";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";
import { toast } from "@/lib/toast";
import type { LeadContactRow, LeadRow, LeadWithBusiness, ProjectRow, Stage } from "@/lib/db/types";

interface CrmPageProps {
  projects: ProjectRow[];
  activeProject: ProjectRow;
  initialLeads: LeadWithBusiness[];
}

export function CrmPage({ projects, activeProject, initialLeads }: CrmPageProps) {
  const router = useRouter();
  const user = useUser();
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const isDesktop = useIsDesktop();

  // Lifted out of the board components so the funnel above the board (and
  // the board itself, if the user switches viewport size) all read the same
  // state instead of each keeping a private copy seeded from initialLeads.
  const [leads, setLeads] = useState(initialLeads);
  // Set while a lead mutation is in flight, so a refresh landing mid-PATCH
  // can't briefly paint the pre-change server state over the optimistic one.
  const mutatingRef = useRef(0);

  // initialLeads only seeds this state, so anything that changed since the
  // page was rendered (a lead marked from the map, an edit in another tab,
  // a phone waking up on a stale screen) would otherwise never appear.
  useRefreshOnFocus(
    useCallback(async () => {
      if (mutatingRef.current > 0) return;
      try {
        const res = await fetch(`/api/leads?projectId=${activeProject.id}`);
        if (!res.ok) return;
        const data = (await res.json()) as { leads?: LeadWithBusiness[] };
        if (mutatingRef.current === 0) setLeads(data.leads ?? []);
      } catch (err) {
        // Silent on purpose — whatever is on screen stays usable.
        console.error("Error al refrescar los leads:", err);
      }
    }, [activeProject.id])
  );

  const handleLeadUpdated = (updated: LeadRow) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
  };

  const handleContactsChanged = (leadId: string, contacts: LeadContactRow[]) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, contacts } : l)));
  };

  const handleStageChange = async (leadId: string, stage: Stage) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === stage) return;
    const previousStage = lead.stage;
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage } : l)));

    mutatingRef.current++;
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error("Error desconocido");
    } catch (err) {
      console.error("Error al mover el lead:", err);
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: previousStage } : l)));
      toast({ title: "No se pudo mover el lead", variant: "error" });
    } finally {
      mutatingRef.current--;
    }
  };

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-sheet">
      <TopBar
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(id) => router.push(`/proyectos/${id}/crm`)}
        onCreateProject={() => router.push(`/proyectos/${activeProject.id}`)}
        onEditProject={() => setEditDrawerOpen(true)}
        user={user}
        // This route only ever renders past its own server-side paywall
        // redirect (see app/proyectos/[id]/crm/page.tsx) — anyone here is
        // already paid, same reasoning as BottomNav's isPaid default.
        isPaid
      />

      <main
        className={
          isDesktop
            ? "min-h-0 flex-1 overflow-y-auto overscroll-contain mx-auto w-full max-w-screen-2xl px-6 pt-20 pb-[calc(var(--bottom-nav-clearance)+1rem)]"
            : "min-h-0 flex-1 overflow-y-auto overscroll-contain mx-auto w-full max-w-2xl px-4 pt-20"
        }
      >
        <LeadFunnel leads={leads} className={isDesktop ? undefined : "max-w-none"} />
        {isDesktop ? (
          <KanbanBoard
            projectId={activeProject.id}
            leads={leads}
            onStageChange={handleStageChange}
            onLeadUpdated={handleLeadUpdated}
            onContactsChanged={handleContactsChanged}
          />
        ) : (
          <CrmBoard
            projectId={activeProject.id}
            leads={leads}
            onStageChange={handleStageChange}
            onLeadUpdated={handleLeadUpdated}
            onContactsChanged={handleContactsChanged}
          />
        )}
      </main>

      <BottomNav projectId={activeProject.id} active="crm" />

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
