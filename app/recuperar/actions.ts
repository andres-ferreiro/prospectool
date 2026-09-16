"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clearPendingEmail, getPendingEmail, setPendingEmail } from "@/lib/auth/pending-email";

export interface RecoveryActionState {
  error: string | null;
  notice?: string | null;
}

const SESSION_EXPIRED = "El proceso expiró. Vuelve a pedir un código.";

export async function requestPasswordReset(
  _prevState: RecoveryActionState,
  formData: FormData
): Promise<RecoveryActionState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) return { error: "Escribe tu correo." };

  const supabase = await createSupabaseServerClient();
  // No redirectTo — the "Reset password" template sends a {{ .Token }} code
  // that is redeemed at /recuperar/verificar, not a link.
  //
  // The result is deliberately ignored: reporting whether the address exists
  // would turn this endpoint into an account-enumeration oracle. The user is
  // sent to the next step either way, and only someone who actually receives
  // the email can continue.
  await supabase.auth.resetPasswordForEmail(email);

  await setPendingEmail("recovery", email);
  redirect("/recuperar/verificar");
}

export async function resendRecoveryCode(
  _prevState: RecoveryActionState,
  _formData: FormData
): Promise<RecoveryActionState> {
  const email = await getPendingEmail("recovery");
  if (!email) return { error: SESSION_EXPIRED };

  const supabase = await createSupabaseServerClient();
  // auth.resend() covers only 'signup' and 'email_change', so a recovery code
  // is reissued by calling resetPasswordForEmail again.
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return { error: "Espera un momento antes de pedir otro código." };

  return { error: null, notice: "Te enviamos un código nuevo." };
}

export async function resetPassword(
  _prevState: RecoveryActionState,
  formData: FormData
): Promise<RecoveryActionState> {
  const code = String(formData.get("code") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmPassword") ?? "");

  const email = await getPendingEmail("recovery");
  if (!email) return { error: SESSION_EXPIRED };

  // Every check that does not need Supabase runs before verifyOtp on purpose.
  // verifyOtp issues a real session on success, so failing validation after it
  // would leave someone signed in with their old password still in place.
  if (!/^\d{6}$/.test(code)) return { error: "Ingresa el código de 6 dígitos." };
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };
  if (password !== confirmation) return { error: "Las contraseñas no coinciden." };

  const supabase = await createSupabaseServerClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
  if (verifyError) return { error: "El código es incorrecto o ya expiró." };

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    // The recovery session exists but the password was not changed — sign out
    // so a failed reset can never leave an unexpected logged-in session behind.
    await supabase.auth.signOut();
    return { error: "No se pudo actualizar la contraseña. Inténtalo de nuevo." };
  }

  await clearPendingEmail("recovery");
  redirect("/");
}
