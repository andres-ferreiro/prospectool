"use client";

import { useState } from "react";
import { ProjectNameInput } from "./project-name-input";
import { KeywordPicker } from "./keyword-picker";
import { Button } from "@/components/ui/button";
import { DrawerFooter } from "@/components/ui/drawer";
import { toast } from "@/lib/toast";
import type { ProjectRow } from "@/lib/db/types";

interface CreateProjectFormProps {
  onCreated: (project: ProjectRow) => void;
  initialKeywords?: string[];
}

export function CreateProjectForm({ onCreated, initialKeywords = [] }: CreateProjectFormProps) {
  // Sent to the API as `productService` / stored in the `product_service`
  // column — that field was captured but never displayed anywhere, so it's
  // repurposed here as the project's display name (shown in the project
  // switcher) rather than adding a new column for the same purpose.
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState<string[]>(initialKeywords);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && keywords.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productService: name, keywords }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo crear el proyecto");
      }

      const project = await res.json();
      toast({ title: "Proyecto creado", variant: "success" });
      onCreated(project);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ocurrió un error inesperado";
      setError(message);
      toast({ title: "No se pudo crear el proyecto", description: message, variant: "error" });
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <ProjectNameInput value={name} onChange={setName} />
        <KeywordPicker value={keywords} onChange={setKeywords} />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <DrawerFooter>
        <Button size="lg" className="w-full" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? "Creando…" : "Crear proyecto"}
        </Button>
      </DrawerFooter>
    </>
  );
}
