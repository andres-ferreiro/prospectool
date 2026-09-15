"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GoogleButton } from "@/components/auth/google-button";
import { signUp, type AuthActionState } from "./actions";

const initialState: AuthActionState = { error: null };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
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
            autoComplete="new-password"
            placeholder="••••••••"
            minLength={6}
            required
            className="h-11 rounded-xl border-0 shadow-sm"
          />
        </div>

        <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <Checkbox
            name="acceptTerms"
            checked={acceptedTerms}
            onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
            required
            className="mt-0.5"
          />
          <span>
            Acepto el{" "}
            <Link href="/privacidad" target="_blank" className="font-medium text-primary hover:underline">
              Aviso de Privacidad
            </Link>{" "}
            y los{" "}
            <Link href="/terminos" target="_blank" className="font-medium text-primary hover:underline">
              Términos y Condiciones
            </Link>{" "}
            de Prospectool.
          </span>
        </label>

        {state.error && <p className="text-sm text-destructive">{state.error}</p>}

        <Button type="submit" disabled={pending || !acceptedTerms} className="mt-1 h-11">
          {pending ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        o continúa con
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton disabled={!acceptedTerms} />

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
