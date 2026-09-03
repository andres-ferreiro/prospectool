"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Input } from "@/components/ui/input";
import { STAGES, type LeadRow, type LeadWithBusiness, type Stage } from "@/lib/db/types";
import { toast } from "@/lib/toast";
import { KanbanColumn } from "./kanban-column";
import { LeadDetailModal } from "./lead-detail-modal";

interface KanbanBoardProps {
  initialLeads: LeadWithBusiness[];
}

function isStage(value: unknown): value is Stage {
  return typeof value === "string" && (STAGES as readonly string[]).includes(value);
}

export function KanbanBoard({ initialLeads }: KanbanBoardProps) {
  const [leads, setLeads] = useState(initialLeads);
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

  const handleLeadUpdated = (updated: LeadRow) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const leadId = String(event.active.id);
    const targetStage = event.over?.id;
    if (!isStage(targetStage)) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === targetStage) return;

    const previousStage = lead.stage;
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: targetStage } : l)));

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: targetStage }),
      });
      if (!res.ok) throw new Error("Error desconocido");
    } catch (err) {
      console.error("Error al mover el lead:", err);
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: previousStage } : l)));
      toast({ title: "No se pudo mover el lead", variant: "error" });
    }
  };

  return (
    <>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre..."
          className="h-10 pl-9"
        />
      </div>

      {leads.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Todavía no hay leads. Márcalos como visitados desde el mapa.
        </p>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STAGES.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                leads={leadsByStage.get(stage) ?? []}
                onOpen={setOpenLeadId}
              />
            ))}
          </div>
        </DndContext>
      )}

      <LeadDetailModal
        leadId={openLeadId}
        open={openLeadId !== null}
        onOpenChange={(open) => !open && setOpenLeadId(null)}
        onUpdated={handleLeadUpdated}
        onContactsChanged={(leadId, contacts) =>
          setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, contacts } : l)))
        }
      />
    </>
  );
}
