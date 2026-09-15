"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/auth/google-button";
import { signInWithPassword, type AuthActionState } from "./actions";

const initialState: AuthActionState = { error: null };

export function LoginForm({ next, initialError = null }: { next: string; initialError?: string | null }) {
  const [state, formAction, pending] = useActionState(signInWithPassword, initialState);
  // A server-action error from this form supersedes the one carried over in
  // the URL from a failed OAuth callback.
  const error = state.error ?? initialError;

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            required
            className="h-11 rounded-xl border-0 shadow-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            className="h-11 rounded-xl border-0 shadow-sm"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={pending} className="mt-1 h-11">
          {pending ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        o continúa con
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton next={next} />

      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}
