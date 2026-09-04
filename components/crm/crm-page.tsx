"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/top-bar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { EditProjectDrawer } from "@/components/project-setup/edit-project-drawer";
import { CrmBoard } from "./crm-board";
import { KanbanBoard } from "./kanban-board";
import { useUser } from "@/hooks/use-user";
import { useIsDesktop } from "@/hooks/use-media-query";
import type { LeadWithBusiness, ProjectRow } from "@/lib/db/types";

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

  return (
    <div className="min-h-dvh w-full bg-sheet">
      <TopBar
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(id) => router.push(`/proyectos/${id}/crm`)}
        onCreateProject={() => router.push(`/proyectos/${activeProject.id}`)}
        onEditProject={() => setEditDrawerOpen(true)}
        user={user}
      />

      <main className={isDesktop ? "mx-auto max-w-screen-2xl px-6 pt-20" : "mx-auto max-w-2xl px-4 pt-20"}>
        {isDesktop ? <KanbanBoard initialLeads={initialLeads} /> : <CrmBoard initialLeads={initialLeads} />}
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
