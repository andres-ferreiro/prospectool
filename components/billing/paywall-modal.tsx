"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Logo, LogoIcon } from "@/components/ui/logo";
import { DecorativeAuthMap } from "@/components/auth/decorative-auth-map";
import { useIsDesktop } from "@/hooks/use-media-query";
import { subscribe, closePaywall, type PaywallReason, type PaywallState } from "@/lib/paywall";
import type { LockedResultStats } from "@/lib/billing/limits";
import { GLASS, Glow } from "./glass";
import { PlanCards } from "./plan-cards";

const HEADLINES: Record<PaywallReason, string> = {
  crm: "El CRM está disponible en los planes de pago",
  proyecto: "Crea todos los proyectos que necesites",
  resultados: "Ve todos los resultados de cada búsqueda",
  calendario: "La agenda está disponible en los planes de pago",
};

// One quiet line, not a whole callout — a concrete count for what's real and
// known (this search's own hidden emails/phones). The dataset's overall
// scale is claimed once, in the feature list below ("Bases de datos con
// millones de negocios"), so this doesn't repeat it — nothing to add here
// when there's no per-search stat to show (crm/proyecto reasons).
function StatsLine({ stats }: { stats: LockedResultStats | null }) {
  const parts: string[] = [];
  if (stats && stats.emails > 0) parts.push(`${stats.emails} correo${stats.emails === 1 ? "" : "s"}`);
  if (stats && stats.phones > 0) parts.push(`${stats.phones} teléfono${stats.phones === 1 ? "" : "s"}`);

  if (parts.length === 0) return null;

  return (
    <p className="mt-2 text-sm text-muted-foreground">
      <span className="font-semibold text-primary">{parts.join(" y ")}</span> sin desbloquear
    </p>
  );
}

// Desktop gets a centered modal (mirrors CreateProjectDrawer's split);
// mobile gets a bottom sheet that hugs its own content (like every other
// drawer in the app) instead of forcing a fixed near-fullscreen height —
// a short paywall (crm/proyecto reasons, no stats line) shouldn't leave a
// dead gap below the card. Both lean on real brand surfaces (the wordmark,
// the decorative CDMX map from the auth pages) and a frosted-glass
// treatment instead of a generic sparkle icon on a flat panel.
export function PaywallModal() {
  const isDesktop = useIsDesktop();
  const [state, setState] = useState<PaywallState | null>(null);

  useEffect(() => subscribe(setState), []);

  const open = state !== null;
  const headline = state ? HEADLINES[state.reason] : "Elige tu plan";
  const stats = state?.stats ?? null;

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={(next) => !next && closePaywall()}>
        <DialogContent
          className={`relative z-[100] max-w-2xl overflow-hidden ${GLASS}`}
          overlayClassName="z-[100]"
          viewportClassName="z-[100]"
        >
          <Glow />
          <DialogClose
            aria-label="Cerrar"
            className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground backdrop-blur-sm transition-colors duration-150 hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </DialogClose>
          <div className="relative overflow-y-auto p-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <Logo className="h-8 w-[138px]" priority />
              <DialogTitle className="text-xl font-bold text-foreground">{headline}</DialogTitle>
              <p className="text-sm text-muted-foreground">Encuentra y organiza más clientes potenciales.</p>
              <StatsLine stats={stats} />
            </div>
            <div className="mt-6">
              <PlanCards />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(next) => !next && closePaywall()} showSwipeHandle>
      <DrawerContent
        // No "relative" here: the base Popup class already sets `fixed`
        // (needed for it to bottom-anchor with `bottom-0`, so any leftover
        // space is a gap at the *top*, not the bottom where it would
        // expose BottomNav) — adding "relative" back would silently win
        // the conflict and knock it into normal document flow instead.
        className="overflow-hidden bg-sheet"
        overlayClassName="z-[100]"
        viewportClassName="z-[100]"
      >
        <DrawerClose
          aria-label="Cerrar"
          className="absolute right-4 top-4 z-20 flex size-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground backdrop-blur-sm transition-colors duration-150 hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </DrawerClose>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Fills the whitespace above the plans with the same live,
              decorative CDMX map used on the auth pages, fading into the
              sheet background instead of a hard seam. */}
          <div className="relative h-48 w-full shrink-0 overflow-hidden">
            <DecorativeAuthMap />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-sheet/70 to-sheet" />
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-3">
              <div className={`flex size-16 items-center justify-center rounded-3xl ${GLASS}`}>
                <LogoIcon className="size-9" />
              </div>
            </div>
          </div>

          <div className="px-4 text-center" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
            <DrawerTitle className="text-xl font-bold text-foreground">{headline}</DrawerTitle>
            <p className="mt-1 text-sm text-muted-foreground">Encuentra y organiza más clientes potenciales.</p>
            <StatsLine stats={stats} />

            <div className={`relative mt-5 rounded-3xl p-5 text-left ${GLASS}`}>
              <PlanCards />
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
