"use client";

import { Check, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { useIsDesktop } from "@/hooks/use-media-query";
import { GLASS, Glow } from "./glass";
import { FEATURES } from "./plan-cards";

interface UnlockedModalProps {
  open: boolean;
  onClose: () => void;
}

// Shown right after a successful checkout — the map (see app-shell.tsx's
// ?checkout=exito handling) already re-rendered with isPaid: true by the
// time this can open, since the Stripe success_url now lands here via a
// full page load instead of a client-side transition through /precios (the
// old route left AppShell's isPaid prop stale until a manual refresh).
// Reuses the paywall's own feature list — same claims, now framed as
// "you have this" instead of "unlock this".
function FeatureList() {
  return (
    <ul className="flex flex-col gap-2.5 text-left">
      {FEATURES.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-2.5 text-sm font-medium text-foreground">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3.5" />
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}

export function UnlockedModal({ open, onClose }: UnlockedModalProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className={`relative z-[100] max-w-md overflow-hidden ${GLASS}`}>
          <Glow />
          <DialogClose
            aria-label="Cerrar"
            className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground backdrop-blur-sm transition-colors duration-150 hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </DialogClose>
          <div className="relative flex flex-col items-center gap-4 p-8 text-center">
            <Logo className="h-8 w-[138px]" priority />
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">¡Listo! Ya tienes acceso completo</DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">Esto es lo que acabas de desbloquear.</p>
            </div>
            <FeatureList />
            <Button size="lg" className="mt-2 h-12 w-full text-base" onClick={onClose}>
              Ver mapa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(next) => !next && onClose()} showSwipeHandle>
      <DrawerContent className="overflow-hidden bg-sheet">
        <DrawerClose
          aria-label="Cerrar"
          className="absolute right-4 top-4 z-20 flex size-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground backdrop-blur-sm transition-colors duration-150 hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </DrawerClose>
        <div
          className="flex flex-col items-center gap-4 px-6 pt-10 text-center"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          <Logo className="h-7 w-[125px]" priority />
          <div>
            <DrawerTitle className="text-xl font-bold text-foreground">¡Listo! Ya tienes acceso completo</DrawerTitle>
            <p className="mt-1 text-sm text-muted-foreground">Esto es lo que acabas de desbloquear.</p>
          </div>
          <FeatureList />
          <Button size="lg" className="mt-2 h-12 w-full text-base" onClick={onClose}>
            Ver mapa
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
