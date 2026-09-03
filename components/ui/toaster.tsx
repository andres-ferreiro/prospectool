"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { dismissToast, subscribe, type ToastItem } from "@/lib/toast";
import { cn } from "@/lib/utils";

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => subscribe(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border border-border/50 bg-popover/95 p-3 shadow-soft backdrop-blur"
        >
          {t.variant === "success" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
          {t.variant === "error" && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-medium text-foreground")}>{t.title}</p>
            {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            aria-label="Cerrar"
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
