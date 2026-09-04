"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { useCyclingStatusLine } from "@/hooks/use-cycling-status-line";

interface AiDescribeStepProps {
  onSuggested: (keywords: string[], scianCodes: string[], projectName: string) => void;
  onSkip: () => void;
}

// Cycled on the "Sugerir con IA" button while it's working — matches the
// same shimmer/swap "thinking state" treatment as the post-creation search
// progress card (search-progress-overlay.tsx), so both AI-driven waits in
// this flow feel like the same system.
const SUGGESTING_STATUS_LINES = [
  "Analizando tu negocio…",
  "Buscando categorías SCIAN…",
  "Eligiendo palabras clave…",
];

export function AiDescribeStep({ onSuggested, onSkip }: AiDescribeStepProps) {
  const [productService, setProductService] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const statusLine = useCyclingStatusLine(loading, SUGGESTING_STATUS_LINES);

  const canSubmit = productService.trim().length > 0 && targetAudience.trim().length > 0 && !loading;

  const handleSuggest = async () => {
    if (!canSubmit) return;
    setLoading(true);

    try {
      const res = await fetch("/api/ai/suggest-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productService, targetAudience }),
      });

      if (!res.ok) throw new Error("request failed");

      const data = await res.json();
      const keywords: string[] = Array.isArray(data.keywords) ? data.keywords : [];
      const scianCodes: string[] = Array.isArray(data.scianCodes) ? data.scianCodes : [];
      const projectName: string = typeof data.projectName === "string" ? data.projectName : "";

      if (keywords.length === 0) {
        toast({
          title: "No encontramos sugerencias",
          description: "Elige tus categorías manualmente",
        });
        onSkip();
        return;
      }

      onSuggested(keywords, scianCodes, projectName);
    } catch {
      toast({
        title: "No se pudo sugerir automáticamente",
        description: "Elige tus categorías manualmente",
        variant: "error",
      });
      onSkip();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <div className="space-y-2">
        <Label htmlFor="ai-product-service" className="text-foreground/70">
          ¿Qué producto o servicio ofreces?
        </Label>
        <Textarea
          id="ai-product-service"
          placeholder="Ej. Software de contabilidad para pequeños negocios"
          value={productService}
          onChange={(e) => setProductService(e.target.value)}
          rows={2}
          className="rounded-xl border-0 px-4 py-3 shadow-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ai-target-audience" className="text-foreground/70">
          ¿Quién es tu cliente ideal?
        </Label>
        <Textarea
          id="ai-target-audience"
          placeholder="Ej. Despachos contables y contadores independientes"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          rows={2}
          className="rounded-xl border-0 px-4 py-3 shadow-sm"
        />
      </div>

      <Button size="lg" className="w-full gap-2" onClick={handleSuggest} disabled={!canSubmit}>
        {loading ? (
          <>
            <Sparkles className="h-4 w-4 shrink-0 animate-pulse" />
            <span
              key={statusLine}
              className="shimmer-text status-line-swap"
              style={{ "--shimmer-base": "var(--color-primary-foreground)" } as React.CSSProperties}
            >
              {statusLine}
            </span>
          </>
        ) : (
          "Sugerir con IA"
        )}
      </Button>
      <button
        type="button"
        onClick={onSkip}
        className="text-center text-sm text-foreground/50 underline-offset-2 hover:underline"
      >
        Omitir, elegir manualmente
      </button>
    </div>
  );
}
