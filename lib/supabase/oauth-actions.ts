"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./server";

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = String(formData.get("next") ?? "/");

  const headerList = await headers();
  // x-forwarded-host is a bare hostname with no scheme, so it has to be
  // rebuilt into an absolute origin — Supabase rejects a scheme-less
  // redirect URL. `origin` is present on every server-action POST (Next.js
  // requires it for its CSRF check), so the fallback is belt-and-braces.
  const forwardedHost = headerList.get("x-forwarded-host");
  const forwardedProto = headerList.get("x-forwarded-proto") ?? "https";
  const origin = headerList.get("origin") ?? (forwardedHost ? `${forwardedProto}://${forwardedHost}` : "");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    throw new Error(error?.message ?? "No se pudo iniciar sesión con Google");
  }

  redirect(data.url);
}
