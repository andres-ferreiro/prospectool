"use client";

import { useDraggable } from "@dnd-kit/core";
import { STAGE_COLORS, type LeadWithBusiness } from "@/lib/db/types";
import { toTitleCase } from "@/lib/text";

interface KanbanCardProps {
  lead: LeadWithBusiness;
  onOpen: (leadId: string) => void;
}

export function KanbanCard({ lead, onOpen }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onOpen(lead.id)}
      className={`flex w-full items-start gap-2.5 rounded-xl border border-border bg-card p-3 text-left shadow-md transition-colors duration-150 ease-in-out hover:bg-muted ${
        isDragging ? "z-10 opacity-50 shadow-lg" : ""
      }`}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, touchAction: "none" }
          : { touchAction: "none" }
      }
      {...listeners}
      {...attributes}
    >
      <span
        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: STAGE_COLORS[lead.stage] }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{toTitleCase(lead.business.name)}</p>
        {lead.business.address && (
          <p className="truncate text-xs text-muted-foreground">{toTitleCase(lead.business.address)}</p>
        )}
        {lead.contacts[0] && (lead.contacts[0].name || lead.contacts[0].phone) && (
          <p className="truncate text-xs text-muted-foreground">
            {[lead.contacts[0].name, lead.contacts[0].phone].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </button>
  );
}
