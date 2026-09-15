"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { ProjectNameInput } from "./project-name-input";
import { KeywordPicker } from "./keyword-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DrawerFooter } from "@/components/ui/drawer";
import { useIsDesktop } from "@/hooks/use-media-query";
import { SCIAN_CATALOG } from "@/lib/scian/catalog";
import { toast } from "@/lib/toast";
import { openPaywall } from "@/lib/paywall";
import type { ProjectRow } from "@/lib/db/types";

const SCIAN_TITLE_BY_CODE = new Map(SCIAN_CATALOG.map((c) => [c.code, c.title]));

interface CreateProjectFormProps {
  onCreated: (project: ProjectRow) => void;
  initialKeywords?: string[];
  /** SCIAN codes the AI already picked, shown for context alongside the
   *  keyword picker — informational only here, they're queued for the
   *  location step's category search regardless of what's edited below. */
  initialScianCodes?: string[];
  /** AI-suggested project name, prefilled but still freely editable. */
  initialName?: string;
}

export function CreateProjectForm({
  onCreated,
  initialKeywords = [],
  initialScianCodes = [],
  initialName = "",
}: CreateProjectFormProps) {
  const isDesktop = useIsDesktop();
  // Sent to the API as `productService` / stored in the `product_service`
  // column — that field was captured but never displayed anywhere, so it's
  // repurposed here as the project's display name (shown in the project
  // switcher) rather than adding a new column for the same purpose.
  const [name, setName] = useState(initialName);
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
        // A race (e.g. two tabs) can reach here even past the client-side
        // check in AppShell — show the paywall instead of a raw error.
        if (res.status === 402) {
          openPaywall("proyecto");
          setSubmitting(false);
          return;
        }
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

  const hasCategories = initialScianCodes.length > 0;

  const categoryChips = (
    <div className="flex flex-wrap gap-1.5">
      {initialScianCodes.map((code) => (
        <span key={code} className="rounded-full bg-secondary px-2.5 py-1 text-sm text-secondary-foreground">
          {SCIAN_TITLE_BY_CODE.get(code) ?? code}
        </span>
      ))}
    </div>
  );
  const categoriesHelper = (
    <p className="text-xs text-foreground/40">Las buscaremos automáticamente en cuanto compartas tu ubicación.</p>
  );
  const categoriesLabel = (
    <Label className="flex shrink-0 items-center gap-1.5 text-foreground/70">
      <Sparkles className="h-3.5 w-3.5 text-primary" />
      Categorías sugeridas por IA
    </Label>
  );

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <ProjectNameInput value={name} onChange={setName} />
        {isDesktop ? (
          // Two columns side by side, each with its own bounded,
          // independently scrollable area instead of one long shared
          // scroll — the keyword grid (~50 pills) would otherwise force
          // the whole modal to grow very tall to fit it. Column headings
          // stay outside the scroll-fade-masked area so they're always
          // fully visible, not fading in and out with the content.
          <div className={hasCategories ? "grid grid-cols-2 gap-6" : undefined}>
            <div className="flex min-h-0 flex-col gap-2">
              <Label className="shrink-0 text-foreground/70">¿Qué tipo de negocios buscas?</Label>
              <div className="scroll-fade-y max-h-64 overflow-y-auto pr-1">
                <KeywordPicker value={keywords} onChange={setKeywords} hideLabel />
              </div>
            </div>
            {hasCategories && (
              <div className="flex min-h-0 flex-col gap-2">
                {categoriesLabel}
                <div className="scroll-fade-y max-h-64 space-y-2 overflow-y-auto pr-1">
                  {categoryChips}
                  {categoriesHelper}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Mobile: stacked full-width instead of side-by-side — the
          // drawer's own scroll already handles overflow for the whole
          // form, so categories don't need their own bounded/fade area
          // here, just a divider to read as a distinct section.
          <>
            <KeywordPicker value={keywords} onChange={setKeywords} />
            {hasCategories && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                {categoriesLabel}
                {categoryChips}
                {categoriesHelper}
              </div>
            )}
          </>
        )}
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
