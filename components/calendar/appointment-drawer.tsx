"use client";

import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { AppointmentContent } from "./appointment-content";
import { useIsDesktop } from "@/hooks/use-media-query";
import type { AppointmentWithRelations } from "@/lib/db/types";

interface AppointmentDrawerProps {
  /** null when closed; otherwise "new" or an existing appointment id. */
  target: "new" | string | null;
  projectId: string;
  defaults?: {
    leadId?: string | null;
    businessId?: string | null;
    linkedName?: string | null;
    title?: string;
    location?: string;
    start?: Date;
  };
  onOpenChange: (open: boolean) => void;
  onSaved?: (appointment: AppointmentWithRelations) => void;
  onDeleted?: (id: string) => void;
}

export function AppointmentDrawer({ target, projectId, defaults, onOpenChange, onSaved, onDeleted }: AppointmentDrawerProps) {
  const isDesktop = useIsDesktop();
  const open = target !== null;

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
        {target && (
          <AppointmentContent
            appointmentId={target === "new" ? null : target}
            projectId={projectId}
            defaults={defaults}
            onSaved={(appointment) => {
              onSaved?.(appointment);
              onOpenChange(false);
            }}
            onDeleted={(id) => {
              onDeleted?.(id);
              onOpenChange(false);
            }}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}
