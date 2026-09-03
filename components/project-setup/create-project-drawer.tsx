"use client";

import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { AiDescribeStep } from "./ai-describe-step";
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
  const [step, setStep] = useState<"describe" | "form">("describe");
  const [initialKeywords, setInitialKeywords] = useState<string[]>([]);

  const resetSteps = () => {
    setStep("describe");
    setInitialKeywords([]);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next && dismissible) {
          onClose();
          resetSteps();
        }
      }}
      disablePointerDismissal={!dismissible}
      showSwipeHandle={dismissible && !isDesktop}
      swipeDirection={isDesktop ? "right" : "down"}
    >
      <DrawerContent floating={isDesktop} className="bg-sheet">
        <DrawerHeader>
          <DrawerTitle>Nuevo proyecto</DrawerTitle>
        </DrawerHeader>
        {step === "describe" ? (
          <AiDescribeStep
            onSuggested={(keywords) => {
              setInitialKeywords(keywords);
              setStep("form");
            }}
            onSkip={() => setStep("form")}
          />
        ) : (
          <CreateProjectForm
            initialKeywords={initialKeywords}
            onCreated={(project) => {
              onCreated(project);
              resetSteps();
            }}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}
