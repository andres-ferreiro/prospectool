"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { toast } from "@/lib/toast";
import { PlanCards } from "./plan-cards";
import type { SubscriptionState } from "@/lib/billing/subscription-status";

interface PricingPlansProps {
  state: SubscriptionState;
  reason: string | null;
  status: string | null;
}

const HEADLINES: Record<string, string> = {
  crm: "El CRM está disponible en los planes de pago",
  proyecto: "Crea todos los proyectos que necesites",
  resultados: "Ve todos los resultados de cada búsqueda",
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "long" }).format(new Date(iso));
}

export function PricingPlans({ state, reason, status }: PricingPlansProps) {
  const router = useRouter();
  const [loadingPortal, setLoadingPortal] = useState(false);

  useEffect(() => {
    if (status === "exito") {
      toast({ title: "¡Listo! Estamos activando tu cuenta…", variant: "success" });
      router.refresh();
    }
  }, [status, router]);

  const openPortal = async () => {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "No se pudo abrir el portal de pago", description: data.error, variant: "error" });
        setLoadingPortal(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      toast({ title: "No se pudo abrir el portal de pago", variant: "error" });
      setLoadingPortal(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al mapa
      </Link>

      <div className="text-center">
        <Logo className="mx-auto mb-4 h-7 w-[125px]" />
        <h1 className="text-2xl font-semibold text-foreground">{(reason && HEADLINES[reason]) || "Elige tu plan"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Encuentra y organiza más clientes potenciales.</p>
      </div>

      {state.isPaid ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
          <p className="text-sm font-medium text-foreground">
            Tu plan {state.plan === "yearly" ? "anual" : "mensual"} está activo
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {state.cancelAtPeriodEnd
              ? `Tu plan termina el ${formatDate(state.currentPeriodEnd)} y no se renovará.`
              : state.status === "trialing"
                ? `Tu prueba termina el ${formatDate(state.trialEnd)}.`
                : `Se renueva el ${formatDate(state.currentPeriodEnd)}.`}
          </p>
          <Button className="mt-4 h-11 w-full" variant="secondary" disabled={loadingPortal} onClick={openPortal}>
            {loadingPortal ? "Abriendo…" : "Administrar suscripción"}
          </Button>
        </div>
      ) : (
        <PlanCards />
      )}
    </div>
  );
}
