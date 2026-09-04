"use client";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const handleOpenChange = (next: boolean) => !next && onClose();

  // Desktop gets a centered modal, matching CreateProjectDrawer, instead of
  // the side-panel drawer — see that file's comment for why.
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar proyecto</DialogTitle>
          </DialogHeader>
          {project && <EditProjectForm project={project} onSaved={onSaved} />}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} showSwipeHandle>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Editar proyecto</DrawerTitle>
        </DrawerHeader>
        {project && <EditProjectForm project={project} onSaved={onSaved} />}
      </DrawerContent>
    </Drawer>
  );
}
