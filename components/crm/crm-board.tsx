"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Inbox, Search, SearchX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LeadCard } from "./lead-card";
import { LeadDetailModal } from "./lead-detail-modal";
import {
  STAGES,
  STAGE_COLORS,
  STAGE_LABELS,
  type LeadContactRow,
  type LeadRow,
  type LeadWithBusiness,
  type Stage,
} from "@/lib/db/types";

interface CrmBoardProps {
  projectId: string;
  leads: LeadWithBusiness[];
  onStageChange: (leadId: string, stage: Stage) => Promise<void>;
  onLeadUpdated: (updated: LeadRow) => void;
  onContactsChanged: (leadId: string, contacts: LeadContactRow[]) => void;
}

export function CrmBoard({ projectId, leads, onStageChange, onLeadUpdated, onContactsChanged }: CrmBoardProps) {
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

  return (
    <>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre..."
          className="h-11 rounded-xl border-0 pl-11 shadow-sm"
        />
      </div>

      <div className="flex flex-col gap-2 pb-40">
        {leads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border">
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
        ) : visibleLeads.length === 0 ? (
          <EmptyState size="sm" icon={SearchX} title="Ningún lead coincide en esta etapa" />
        ) : (
          visibleLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onOpen={setOpenLeadId} onStageChange={onStageChange} />
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
        onUpdated={onLeadUpdated}
        onContactsChanged={onContactsChanged}
      />
    </>
  );
}
