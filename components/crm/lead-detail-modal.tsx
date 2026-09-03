"use client";

import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { LeadDetailContent } from "./lead-detail-content";
import { useIsDesktop } from "@/hooks/use-media-query";
import type { LeadContactRow, LeadRow } from "@/lib/db/types";

interface LeadDetailModalProps {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (lead: LeadRow) => void;
  onContactsChanged?: (leadId: string, contacts: LeadContactRow[]) => void;
}

export function LeadDetailModal({ leadId, open, onOpenChange, onUpdated, onContactsChanged }: LeadDetailModalProps) {
  const isDesktop = useIsDesktop();

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      showSwipeHandle={!isDesktop}
      swipeDirection={isDesktop ? "right" : "down"}
    >
      <DrawerContent
        floating={isDesktop}
        className={isDesktop ? "h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)]" : "h-[88dvh] max-h-[88dvh]"}
      >
        {leadId && (
          <LeadDetailContent leadId={leadId} onUpdated={onUpdated} onContactsChanged={onContactsChanged} />
        )}
      </DrawerContent>
    </Drawer>
  );
}
