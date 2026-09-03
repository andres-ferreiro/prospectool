"use client";

import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AiDescribeStep } from "./ai-describe-step";
import { CreateProjectForm } from "./create-project-form";
import { useIsDesktop } from "@/hooks/use-media-query";
import { setPendingAiSearch } from "@/lib/pending-ai-search";
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
  const [step, setStep] = useState<"describe" | "form">("describe");
  const [initialKeywords, setInitialKeywords] = useState<string[]>([]);
  const [initialScianCodes, setInitialScianCodes] = useState<string[]>([]);

  const resetSteps = () => {
    setStep("describe");
    setInitialKeywords([]);
    setInitialScianCodes([]);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && dismissible) {
      onClose();
      resetSteps();
    }
  };

  const body =
    step === "describe" ? (
      <AiDescribeStep
        onSuggested={(keywords, scianCodes) => {
          setInitialKeywords(keywords);
          setInitialScianCodes(scianCodes);
          setStep("form");
        }}
        onSkip={() => setStep("form")}
      />
    ) : (
      <CreateProjectForm
        initialKeywords={initialKeywords}
        onCreated={(project) => {
          if (initialScianCodes.length > 0) setPendingAiSearch(project.id, initialScianCodes);
          onCreated(project);
          resetSteps();
        }}
      />
    );

  // Desktop gets a centered modal (a short, focused form doesn't need a
  // side-panel's persistent screen-edge anchoring); mobile keeps the
  // bottom-sheet drawer, where a modal would fight the platform's native
  // sheet conventions.
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal={!dismissible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo proyecto</DialogTitle>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer
      open={open}
      onOpenChange={handleOpenChange}
      disablePointerDismissal={!dismissible}
      showSwipeHandle={dismissible}
    >
      <DrawerContent className="bg-sheet">
        <DrawerHeader>
          <DrawerTitle>Nuevo proyecto</DrawerTitle>
        </DrawerHeader>
        {body}
      </DrawerContent>
    </Drawer>
  );
}
