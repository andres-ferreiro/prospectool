"use client";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { CreateProjectForm } from "./create-project-form";
import { useIsDesktop } from "@/hooks/use-media-query";
import type { ProjectRow } from "@/lib/db/types";

interface CreateProjectDrawerProps {
  open: boolean;
  dismissible: boolean;
  onClose: () => void;
  onCreated: (project: ProjectRow) => void;
}

export function CreateProjectDrawer({
  open,
  dismissible,
  onClose,
  onCreated,
}: CreateProjectDrawerProps) {
  const isDesktop = useIsDesktop();

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next && dismissible) onClose();
      }}
      disablePointerDismissal={!dismissible}
      showSwipeHandle={dismissible && !isDesktop}
      swipeDirection={isDesktop ? "right" : "down"}
    >
      <DrawerContent floating={isDesktop} className="bg-sheet">
        <DrawerHeader>
          <DrawerTitle>Nuevo proyecto</DrawerTitle>
        </DrawerHeader>
        <CreateProjectForm onCreated={onCreated} />
      </DrawerContent>
    </Drawer>
  );
}
