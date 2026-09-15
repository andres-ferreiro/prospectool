"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AuthActionState {
  error: string | null;
}

export async function signUp(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const acceptedTerms = formData.get("acceptTerms") === "on";

  if (!acceptedTerms) {
    return { error: "Debes aceptar el Aviso de Privacidad y los Términos y Condiciones." };
  }

  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const headerList = await headers();
  // x-forwarded-host is a bare hostname with no scheme, so it has to be
  // rebuilt into an absolute origin — Supabase rejects a scheme-less
  // redirect URL. `origin` is present on every server-action POST (Next.js
  // requires it for its CSRF check), so the fallback is belt-and-braces.
  const forwardedHost = headerList.get("x-forwarded-host");
  const forwardedProto = headerList.get("x-forwarded-proto") ?? "https";
  const origin = headerList.get("origin") ?? (forwardedHost ? `${forwardedProto}://${forwardedHost}` : "");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    return { error: error.message === "User already registered" ? "Ese correo ya tiene una cuenta." : "No se pudo crear la cuenta." };
  }

  redirect("/signup?sent=1");
}
