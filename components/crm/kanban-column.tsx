"use client";

import { useDroppable } from "@dnd-kit/core";
import { STAGE_COLORS, STAGE_LABELS, type LeadWithBusiness, type Stage } from "@/lib/db/types";
import { KanbanCard } from "./kanban-card";

interface KanbanColumnProps {
  stage: Stage;
  leads: LeadWithBusiness[];
  onOpen: (leadId: string) => void;
}

export function KanbanColumn({ stage, leads, onOpen }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-sheet">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: STAGE_COLORS[stage] }}
          aria-hidden
        />
        <p className="flex-1 truncate text-sm font-medium">{STAGE_LABELS[stage]}</p>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {leads.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-2 transition-colors duration-150 ${
          isOver ? "bg-primary/5" : ""
        }`}
      >
        {leads.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Sin leads</p>
        ) : (
          leads.map((lead) => <KanbanCard key={lead.id} lead={lead} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
}
