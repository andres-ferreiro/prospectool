"use client";

import { useState } from "react";
import { Sparkles, Layers, Rows3, Database, Kanban, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import type { BillingPlan } from "@/lib/db/types";

// Exported so the post-checkout "unlocked" celebration (unlocked-modal.tsx)
// can list the exact same features rather than a second, driftable copy.
export const FEATURES = [
  { icon: Sparkles, label: "Búsqueda inteligente con IA" },
  { icon: Database, label: "Bases de datos con millones de negocios" },
  { icon: Rows3, label: "Todos los resultados de cada búsqueda" },
  { icon: Layers, label: "Proyectos ilimitados" },
  { icon: Kanban, label: "CRM completo con embudo y contactos" },
];

const PLAN_COPY: Record<
  BillingPlan,
  { label: string; big: string; unit?: string; sub: string; fine: string; cta: string }
> = {
  monthly: {
    label: "Mensual",
    big: "$5",
    unit: "MXN",
    sub: "el primer mes",
    fine: "Después $49 MXN al mes. Cancela cuando quieras.",
    cta: "Empezar por $5 MXN",
  },
  yearly: {
    label: "Anual",
    big: "GRATIS",
    sub: "por 7 días",
    fine: "Después $399 MXN al año. Cancela cuando quieras.",
    cta: "Empezar gratis",
  },
};

// One feature list, one decision (which plan), one action — a paywall with
// two full duplicated cards makes the reader do the same comparison twice.
// The plan choice is a pair of compact selectable tiles (radio-style, not
// two separate checkout buttons), so there is exactly one CTA and its label
// always matches what's about to happen.
export function PlanCards() {
  const [selected, setSelected] = useState<BillingPlan>("yearly");
  const [loading, setLoading] = useState(false);
  const copy = PLAN_COPY[selected];

  const startCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "No se pudo iniciar el pago", description: data.error, variant: "error" });
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      toast({ title: "No se pudo iniciar el pago", variant: "error" });
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-2.5">
        {FEATURES.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2.5 text-sm font-medium text-foreground">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15">
              <Icon className="size-3.5" />
            </span>
            {label}
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(PLAN_COPY) as BillingPlan[]).map((plan) => {
          const isSelected = plan === selected;
          const planCopy = PLAN_COPY[plan];
          return (
            <button
              key={plan}
              type="button"
              onClick={() => setSelected(plan)}
              aria-pressed={isSelected}
              className={cn(
                "relative flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left transition-colors duration-150 ease-in-out",
                isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-foreground/20"
              )}
            >
              {plan === "yearly" && (
                <Badge className="absolute -top-2.5 right-3">Recomendado</Badge>
              )}
              <span className="text-xs font-medium text-muted-foreground">{planCopy.label}</span>
              <span
                className={cn(
                  "font-bold tracking-tight",
                  plan === "yearly" ? "text-3xl text-primary" : "text-3xl text-foreground"
                )}
              >
                {planCopy.big}
                {planCopy.unit && <span className="text-sm font-semibold text-muted-foreground"> {planCopy.unit}</span>}
              </span>
              <span className="text-xs text-muted-foreground">{planCopy.sub}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <Button size="lg" className="h-12 text-base" disabled={loading} onClick={startCheckout}>
          {loading ? "Redirigiendo…" : copy.cta}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{copy.fine}</p>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" />
        Pago seguro procesado por Stripe
      </p>
    </div>
  );
}
