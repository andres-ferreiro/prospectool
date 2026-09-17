"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

// Without this file a throw in any server component renders Next.js's bare
// "This page couldn't load" screen, which offers only a full reload and hides
// the error digest in the page footer. `reset()` re-renders the segment, which
// recovers from a transient failure (a statement timeout, a momentary auth
// blip) without discarding the whole client.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app-error]", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-sheet px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        <Logo className="mb-4 h-7 w-[125px]" />
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Algo salió mal</h1>
        <p className="text-sm text-muted-foreground">
          No pudimos cargar esta pantalla. Suele ser temporal — vuelve a intentarlo.
        </p>

        <Button onClick={reset} className="mt-2 h-11 w-full">
          Reintentar
        </Button>
        <Link href="/" className="text-sm font-medium text-primary hover:underline">
          Ir al inicio
        </Link>

        {error.digest && (
          // Surfaced so a user reporting the problem can quote it — it is the
          // key for finding the real stack trace in the server logs.
          <p className="pt-2 font-mono text-xs text-muted-foreground">Código: {error.digest}</p>
        )}
      </div>
    </main>
  );
}
