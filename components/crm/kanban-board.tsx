"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Inbox, Search } from "lucide-react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { STAGES, type LeadContactRow, type LeadRow, type LeadWithBusiness, type Stage } from "@/lib/db/types";
import { KanbanColumn } from "./kanban-column";
import { LeadDetailModal } from "./lead-detail-modal";

interface KanbanBoardProps {
  projectId: string;
  leads: LeadWithBusiness[];
  onStageChange: (leadId: string, stage: Stage) => Promise<void>;
  onLeadUpdated: (updated: LeadRow) => void;
  onContactsChanged: (leadId: string, contacts: LeadContactRow[]) => void;
}

function isStage(value: unknown): value is Stage {
  return typeof value === "string" && (STAGES as readonly string[]).includes(value);
}

// Matches KanbanColumn's w-72 and the row's gap-3 — used to give the board
// row an explicit width so margin:auto can center it when it fits the
// viewport, while still scrolling (not clipping) when it doesn't. A plain
// `justify-center` on the scroll container would clip the first column
// instead of scrolling to it once the row overflows.
const COLUMN_WIDTH = 288;
const COLUMN_GAP = 12;
const BOARD_WIDTH = STAGES.length * COLUMN_WIDTH + (STAGES.length - 1) * COLUMN_GAP;

export function KanbanBoard({ projectId, leads, onStageChange, onLeadUpdated, onContactsChanged }: KanbanBoardProps) {
  const [query, setQuery] = useState("");
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  // A small drag-distance threshold before a pointer-down counts as a drag
  // — without it, every card click (opening the detail panel) would also
  // register as a zero-distance drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const leadsByStage = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<Stage, LeadWithBusiness[]>();
    for (const stage of STAGES) map.set(stage, []);
    for (const lead of leads) {
      if (q !== "") {
        const matchesBusiness = lead.business.name.toLowerCase().includes(q);
        const matchesContact = lead.contacts.some(
          (c) => c.name?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
        );
        if (!matchesBusiness && !matchesContact) continue;
      }
      map.get(lead.stage)?.push(lead);
    }
    return map;
  }, [leads, query]);

  const handleDragEnd = (event: DragEndEvent) => {
    const leadId = String(event.active.id);
    const targetStage = event.over?.id;
    if (!isStage(targetStage)) return;
    onStageChange(leadId, targetStage);
  };

  return (
    <>
      <div className="relative mx-auto mb-4 max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre..."
          className="h-11 rounded-xl border-0 pl-11 shadow-sm"
        />
      </div>

      {leads.length === 0 ? (
        <div className="mx-auto max-w-xl rounded-xl border border-dashed border-border">
          <EmptyState
            icon={Inbox}
            title="Todavía no tienes leads"
            description="Márcalos como visitados desde el mapa para que aparezcan aquí."
            action={
              <Button size="sm" variant="secondary" render={<Link href={`/proyectos/${projectId}`} />}>
                Ir al mapa
              </Button>
            }
          />
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="overflow-x-auto pb-4">
            <div className="mx-auto flex gap-3" style={{ width: BOARD_WIDTH }}>
              {STAGES.map((stage) => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  leads={leadsByStage.get(stage) ?? []}
                  onOpen={setOpenLeadId}
                />
              ))}
            </div>
          </div>
        </DndContext>
      )}

      <LeadDetailModal
        leadId={openLeadId}
        open={openLeadId !== null}
        onOpenChange={(open) => !open && setOpenLeadId(null)}
        onUpdated={onLeadUpdated}
        onContactsChanged={onContactsChanged}
      />
    </>
  );
}
