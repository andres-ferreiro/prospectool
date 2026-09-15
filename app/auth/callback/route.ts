import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";

  // Supabase redirects here with ?error=/&error_description= when the provider
  // itself rejected the sign-in (consent denied, app not verified, etc.) — no
  // code is issued in that case, so surface it instead of silently bouncing.
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    console.error("[auth-callback] provider returned an error", providerError);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(providerError)}`);
  }

  if (!code) {
    console.error("[auth-callback] no code in callback URL", searchParams.toString());
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Falta el código de autenticación.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  // Previously this error was discarded and we redirected to `next` anyway —
  // the proxy then found no session and bounced straight back to /login, which
  // looks to the user like the button simply did nothing. Surface it instead.
  if (error) {
    console.error("[auth-callback] exchangeCodeForSession failed", {
      name: error.name,
      status: error.status,
      code: error.code,
      message: error.message,
    });
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
