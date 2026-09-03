"use client";

import { useState } from "react";
import { ProjectNameInput } from "./project-name-input";
import { KeywordPicker } from "./keyword-picker";
import { Button } from "@/components/ui/button";
import { DrawerFooter } from "@/components/ui/drawer";
import { toast } from "@/lib/toast";
import type { ProjectRow } from "@/lib/db/types";

interface EditProjectFormProps {
  project: ProjectRow;
  onSaved: (project: ProjectRow) => void;
}

export function EditProjectForm({ project, onSaved }: EditProjectFormProps) {
  const [name, setName] = useState(project.product_service);
  const [keywords, setKeywords] = useState<string[]>(project.keywords);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim().length > 0 && keywords.length > 0 && !saving;

  const handleSubmit = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productService: name, keywords }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo guardar el proyecto");
      }

      const updated = await res.json();
      toast({ title: "Proyecto actualizado", variant: "success" });
      onSaved(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ocurrió un error inesperado";
      setError(message);
      toast({ title: "No se pudo guardar el proyecto", description: message, variant: "error" });
    } finally {
      setSaving(false);
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
        <Button size="lg" className="w-full" onClick={handleSubmit} disabled={!canSave}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </DrawerFooter>
    </>
  );
}
