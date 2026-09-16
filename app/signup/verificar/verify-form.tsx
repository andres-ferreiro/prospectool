"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CodeInput } from "@/components/auth/code-input";
import type { AuthActionState } from "../actions";
import { resendSignupCode, verifySignupCode } from "./actions";

const initialState: AuthActionState = { error: null };

// Supabase rate-limits auth emails per project, so a visible countdown is
// friendlier than letting people tap Resend into an error.
const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyForm() {
  const [state, formAction, pending] = useActionState(verifySignupCode, initialState);
  const [resendState, resendAction, resending] = useActionState(resendSignupCode, initialState);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const message = state.error ?? resendState.error;

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">Código de verificación</Label>
          <CodeInput disabled={pending} />
        </div>

        {message && <p className="text-sm text-destructive">{message}</p>}
        {!message && resendState.notice && <p className="text-sm text-muted-foreground">{resendState.notice}</p>}

        <Button type="submit" disabled={pending} className="mt-1 h-11">
          {pending ? "Verificando…" : "Verificar y entrar"}
        </Button>
      </form>

      <form action={resendAction} onSubmit={() => setCooldown(RESEND_COOLDOWN_SECONDS)}>
        <Button
          type="submit"
          variant="ghost"
          disabled={resending || cooldown > 0}
          className="h-10 w-full text-sm font-normal text-muted-foreground"
        >
          {cooldown > 0 ? `Reenviar código en ${cooldown}s` : resending ? "Enviando…" : "Reenviar código"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿Correo equivocado?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Empieza de nuevo
        </Link>
      </p>
    </div>
  );
}
