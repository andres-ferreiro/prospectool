"use client";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { EditProjectForm } from "./edit-project-form";
import { useIsDesktop } from "@/hooks/use-media-query";
import type { ProjectRow } from "@/lib/db/types";

interface EditProjectDrawerProps {
  open: boolean;
  project: ProjectRow | null;
  onClose: () => void;
  onSaved: (project: ProjectRow) => void;
}

export function EditProjectDrawer({ open, project, onClose, onSaved }: EditProjectDrawerProps) {
  const isDesktop = useIsDesktop();

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => !next && onClose()}
      showSwipeHandle={!isDesktop}
      swipeDirection={isDesktop ? "right" : "down"}
    >
      <DrawerContent floating={isDesktop} className="bg-sheet">
        <DrawerHeader>
          <DrawerTitle>Editar proyecto</DrawerTitle>
        </DrawerHeader>
        {project && <EditProjectForm project={project} onSaved={onSaved} />}
      </DrawerContent>
    </Drawer>
  );
}
