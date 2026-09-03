"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LeadCard } from "./lead-card";
import { LeadDetailModal } from "./lead-detail-modal";
import { toast } from "@/lib/toast";
import {
  STAGES,
  STAGE_COLORS,
  STAGE_LABELS,
  type LeadRow,
  type LeadWithBusiness,
  type Stage,
} from "@/lib/db/types";

interface CrmBoardProps {
  initialLeads: LeadWithBusiness[];
}

export function CrmBoard({ initialLeads }: CrmBoardProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [activeStage, setActiveStage] = useState<Stage>("contacted");
  const [query, setQuery] = useState("");
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  const countsByStage = useMemo(() => {
    const counts = new Map<Stage, number>();
    for (const stage of STAGES) counts.set(stage, 0);
    for (const lead of leads) counts.set(lead.stage, (counts.get(lead.stage) ?? 0) + 1);
    return counts;
  }, [leads]);

  const visibleLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (lead.stage !== activeStage) return false;
      if (q === "") return true;
      if (lead.business.name.toLowerCase().includes(q)) return true;
      return lead.contacts.some(
        (c) => c.name?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
      );
    });
  }, [leads, activeStage, query]);

  const handleLeadUpdated = (updated: LeadRow) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
  };

  // Swipe-to-advance / swipe-to-mark-lost on the card (see lead-card.tsx) —
  // same PATCH endpoint and optimistic-update-with-rollback the desktop
  // Kanban board's drag-and-drop uses.
  const handleStageChange = async (leadId: string, stage: Stage) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === stage) return;
    const previousStage = lead.stage;
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage } : l)));

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

      <div className="flex flex-col gap-2 pb-40">
        {leads.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Todavía no hay leads. Márcalos como visitados desde el mapa.
          </p>
        ) : visibleLeads.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Ningún lead coincide en esta etapa.
          </p>
        ) : (
          visibleLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onOpen={setOpenLeadId} onStageChange={handleStageChange} />
          ))
        )}
      </div>

      <div className="fixed inset-x-0 bottom-[76px] z-30 flex justify-center px-4">
        <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-full bg-popover/95 p-1.5 shadow-soft backdrop-blur">
          {STAGES.map((stage) => {
            const active = stage === activeStage;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setActiveStage(stage)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors duration-150 ease-in-out ${
                  active ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted"
                }`}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: STAGE_COLORS[stage] }}
                  aria-hidden
                />
                {STAGE_LABELS[stage]}
                <Badge variant={active ? "secondary" : "outline"} className="h-4 px-1.5 text-[10px]">
                  {countsByStage.get(stage) ?? 0}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

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
