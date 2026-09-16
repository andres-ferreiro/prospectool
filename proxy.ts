import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// The Stripe webhook is called by Stripe's servers, not a signed-in browser
// — it has no cookies to authenticate with, and verifies itself via the
// request signature instead (see app/api/webhooks/stripe/route.ts).
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/auth/callback",
  "/api/webhooks/stripe",
  "/recuperar",
  "/privacidad",
  "/terminos",
  // Static PWA assets fetched by the browser/OS outside any page
  // navigation (service worker registration, install-prompt manifest,
  // offline fallback) — never gated behind auth, or they 404/redirect to
  // /login and silently break installability for signed-out visitors.
  "/sw.js",
  "/manifest.webmanifest",
  "/offline.html",
];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!user && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
