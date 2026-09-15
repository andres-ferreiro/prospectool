"use client";

import { useMemo } from "react";
import { FunnelChart, type FunnelStage } from "@/components/ui/funnel-chart";
import { STAGE_COLORS, STAGE_LABELS, type LeadWithBusiness } from "@/lib/db/types";
import { cn } from "@/lib/utils";

interface LeadFunnelProps {
  leads: LeadWithBusiness[];
  // Lets the caller match whatever width its own search bar uses right
  // below — the desktop board centers a narrow search bar, the mobile one
  // runs full-width, and the funnel should read as one block with either.
  className?: string;
}

// Funnel order toward a won deal — "lost" is an exit, not a step on the way
// there, so it's excluded rather than shown as the smallest/last segment.
const FUNNEL_STAGES = ["contacted", "interested", "negotiating", "won"] as const;

export function LeadFunnel({ leads, className }: LeadFunnelProps) {
  const data = useMemo<FunnelStage[]>(() => {
    const counts = new Map<string, number>();
    for (const lead of leads) counts.set(lead.stage, (counts.get(lead.stage) ?? 0) + 1);

    return FUNNEL_STAGES.map((stage, i) => {
      const nextStage = FUNNEL_STAGES[i + 1] ?? stage;
      return {
        label: STAGE_LABELS[stage],
        value: counts.get(stage) ?? 0,
        gradient: [
          { offset: "0%", color: STAGE_COLORS[stage] },
          { offset: "100%", color: STAGE_COLORS[nextStage] },
        ],
      };
    });
  }, [leads]);

  if (data[0]?.value === 0) return null;

  return (
    <div className={cn("mx-auto mb-4 max-w-xl", className)}>
      <FunnelChart
        data={data}
        layers={2}
        gap={4}
        labelLayout="grouped"
        labelOrientation="vertical"
        style={{ aspectRatio: "5.5 / 1" }}
      />
    </div>
  );
}
