"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clearPendingEmail, getPendingEmail } from "@/lib/auth/pending-email";
import type { AuthActionState } from "../actions";

const SESSION_EXPIRED = "La verificación expiró. Vuelve a crear tu cuenta.";

export async function verifySignupCode(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const code = String(formData.get("code") ?? "").trim();
  const email = await getPendingEmail("signup");

  if (!email) return { error: SESSION_EXPIRED };
  if (!/^\d{6}$/.test(code)) return { error: "Ingresa el código de 6 dígitos." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });

  if (error) {
    // Deliberately one message for every failure mode. Distinguishing "wrong
    // code" from "expired" from "no such pending signup" would let someone
    // probe which addresses have an account awaiting confirmation.
    return { error: "El código es incorrecto o ya expiró." };
  }

  await clearPendingEmail("signup");
  // verifyOtp returns a session, so the user is signed in from here.
  redirect("/");
}

export async function resendSignupCode(
  _prevState: AuthActionState,
  _formData: FormData
): Promise<AuthActionState> {
  const email = await getPendingEmail("signup");
  if (!email) return { error: SESSION_EXPIRED };

  const supabase = await createSupabaseServerClient();
  // `resend` accepts only 'signup' | 'email_change' for email — recovery codes
  // are reissued by calling resetPasswordForEmail again instead.
  const { error } = await supabase.auth.resend({ type: "signup", email });

  if (error) {
    // Supabase applies its own per-project email rate limit on top of the SMTP
    // provider's, and this is the error users realistically hit.
    return { error: "Espera un momento antes de pedir otro código." };
  }

  return { error: null, notice: "Te enviamos un código nuevo." };
}
