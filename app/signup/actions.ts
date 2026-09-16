"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setPendingEmail } from "@/lib/auth/pending-email";

export interface AuthActionState {
  error: string | null;
  // Set only by the resend action, so the verify screen can confirm a new code
  // went out without turning that into an error-styled message.
  notice?: string | null;
}

export async function signUp(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const acceptedTerms = formData.get("acceptTerms") === "on";

  if (!acceptedTerms) {
    return { error: "Debes aceptar el Aviso de Privacidad y los Términos y Condiciones." };
  }

  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const supabase = await createSupabaseServerClient();
  // No emailRedirectTo: the "Confirm signup" template sends a 6-digit
  // {{ .Token }} rather than a link, and the code is redeemed at
  // /signup/verificar via verifyOtp. A link would open in the OS browser
  // rather than the installed PWA, stranding the session in the wrong place.
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: "No se pudo crear la cuenta. Revisa el correo e inténtalo de nuevo." };
  }

  // Deliberately identical whether or not the address was already registered —
  // Supabase obfuscates that case to prevent account enumeration, and diverging
  // here would reintroduce the leak it is protecting against.
  await setPendingEmail("signup", email);
  redirect("/signup/verificar");
}
