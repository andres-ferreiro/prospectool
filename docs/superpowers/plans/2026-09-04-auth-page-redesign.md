# Auth Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/login` and `/signup` with a polished form UI (both breakpoints), a "Continuar con Google" OAuth option, and — desktop only — a floating form card over a frozen decorative Mapbox view of CDMX dotted with fake business pins.

**Architecture:** A pure, testable dot-generator feeds a new `DecorativeAuthMap` (desktop-only, reuses the app's existing `react-map-gl`/`BusinessPin` setup, all interaction disabled). A new `AuthLayout` client component branches on the existing `useIsDesktop()` hook: mobile renders today's plain centered-card markup unchanged in structure but with polished inputs; desktop wraps the same card content in a floating position over `DecorativeAuthMap`. Google sign-in is one new server action (`signInWithGoogle`, mirrors the existing `signInWithPassword`/`signUp` FormData convention) shared by both pages, plumbed through the existing `/auth/callback` route (extended to honor a `next` param).

**Tech Stack:** Next.js App Router server actions, `react-map-gl`/Mapbox GL (already a dependency), `@supabase/ssr`, Vitest for the one pure-logic unit, existing shadcn-style UI primitives (`Button`, `Input`, `Label`).

## Global Constraints

- Spanish copy throughout (matches the rest of the app: "Continuar con Google", "o continúa con").
- Mobile layout keeps today's structure and behavior exactly — no map, no floating card, just polished inputs/spacing (per spec §"Mobile" and the user's follow-up: enhance mobile's form UI but without the map).
- Desktop breakpoint is the existing `useIsDesktop()` hook (`hooks/use-media-query.ts`, `min-width: 1024px`) — do not introduce a new breakpoint.
- Reuse existing tokens/components: `bg-popover`, `shadow-soft`, `rounded-2xl`, `BusinessPin`, `DEFAULT_PIN_COLOR` (`#0a84ff`), the `mapbox://styles/mapbox/{dark-v11|light-v11}` theme switch already in `business-map.tsx`.
- No new npm dependencies — everything needed (`react-map-gl`, `mapbox-gl`, `next-themes`, `lucide-react`) is already installed.
- Google Cloud/Supabase dashboard configuration is manual and out of scope for these tasks — handed to the user separately after the code lands.

---

## Task 1: Seeded CDMX dot generator (pure, testable)

**Files:**
- Create: `lib/auth/decorative-dots.ts`
- Test: `lib/auth/decorative-dots.test.ts`

**Interfaces:**
- Produces: `generateDecorativeDots(count: number, seed: number): { lat: number; lng: number }[]` — later tasks (Task 6) call this with a fixed count/seed to get a stable (not per-render-random) scatter of points around CDMX.

- [ ] **Step 1: Write the failing test**

```ts
// lib/auth/decorative-dots.test.ts
import { describe, expect, it } from "vitest";
import { generateDecorativeDots } from "./decorative-dots";

describe("generateDecorativeDots", () => {
  it("returns exactly `count` points", () => {
    const dots = generateDecorativeDots(40, 1);
    expect(dots).toHaveLength(40);
  });

  it("is deterministic for a given seed", () => {
    const a = generateDecorativeDots(40, 7);
    const b = generateDecorativeDots(40, 7);
    expect(a).toEqual(b);
  });

  it("produces different scatters for different seeds", () => {
    const a = generateDecorativeDots(40, 1);
    const b = generateDecorativeDots(40, 2);
    expect(a).not.toEqual(b);
  });

  it("keeps every point within roughly 6km of the CDMX center", () => {
    const CDMX = { lat: 19.4326, lng: -99.1332 };
    const dots = generateDecorativeDots(40, 1);
    for (const { lat, lng } of dots) {
      // ~0.054 degrees latitude is ~6km; longitude at this latitude is
      // close enough to the same scale not to need a cos(lat) correction
      // for a sanity check this loose.
      expect(Math.abs(lat - CDMX.lat)).toBeLessThan(0.06);
      expect(Math.abs(lng - CDMX.lng)).toBeLessThan(0.06);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/auth/decorative-dots.test.ts`
Expected: FAIL — `Cannot find module './decorative-dots'`

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/auth/decorative-dots.ts

// A small linear congruential generator — deterministic and dependency-free,
// unlike Math.random(), so the same seed always produces the same scatter
// (no dots "jumping" between renders/hydration).
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CDMX_CENTER = { lat: 19.4326, lng: -99.1332 };
// ~0.05 degrees is roughly 5-6km at this latitude — enough spread to fill
// a map tile at zoom 12 without dots drifting off past the visible area.
const SPREAD_DEGREES = 0.05;

export function generateDecorativeDots(count: number, seed: number): { lat: number; lng: number }[] {
  const random = mulberry32(seed);
  const dots: { lat: number; lng: number }[] = [];
  for (let i = 0; i < count; i++) {
    dots.push({
      lat: CDMX_CENTER.lat + (random() - 0.5) * 2 * SPREAD_DEGREES,
      lng: CDMX_CENTER.lng + (random() - 0.5) * 2 * SPREAD_DEGREES,
    });
  }
  return dots;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/auth/decorative-dots.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/auth/decorative-dots.ts lib/auth/decorative-dots.test.ts
git commit -m "Add seeded CDMX dot generator for the decorative auth-page map

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Google OAuth server action

**Files:**
- Create: `lib/supabase/oauth-actions.ts`

**Interfaces:**
- Consumes: `createSupabaseServerClient()` from `lib/supabase/server.ts` (existing).
- Produces: `signInWithGoogle(formData: FormData): Promise<void>` — a server action. Reads a `next` field off `formData` (defaults to `"/"`), matching the same convention `signInWithPassword` in `app/login/actions.ts` already uses. Never returns normally on success — always `redirect()`s (to Google's consent screen) or throws. Task 4's `GoogleButton` uses this directly as a `<form action={signInWithGoogle}>`.

No automated test for this task: it's a thin wrapper whose only logic is a Supabase network call and a redirect, the same shape as the existing untested `signInWithPassword`/`signUp` actions in this codebase — verified by `tsc`, not a unit test.

- [ ] **Step 1: Write the action**

```ts
// lib/supabase/oauth-actions.ts
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./server";

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = String(formData.get("next") ?? "/");

  const headerList = await headers();
  const origin = headerList.get("origin") ?? headerList.get("x-forwarded-host") ?? "";

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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/oauth-actions.ts
git commit -m "Add signInWithGoogle server action

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Honor `next` in the OAuth callback route

**Files:**
- Modify: `app/auth/callback/route.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: same route, now redirects to whatever `next` query param was set (defaulting to `/` exactly as before) instead of always `/` — so `signInWithGoogle`'s `next` (Task 2) actually takes effect after the round trip.

- [ ] **Step 1: Update the route**

Current content:
```ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/`);
}
```

Replace with:
```ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/auth/callback/route.ts
git commit -m "Honor a next redirect param in the OAuth callback route

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: `GoogleButton` component

**Files:**
- Create: `components/auth/google-button.tsx`

**Interfaces:**
- Consumes: `signInWithGoogle` from `lib/supabase/oauth-actions.ts` (Task 2), `Button` from `components/ui/button.tsx`.
- Produces: `GoogleButton({ next }: { next?: string })` — a client-safe component (no `"use client"` needed; it's a plain form, works as a Server Component too, but lives under `components/auth/` alongside the other client auth pieces for colocation). Used directly by `LoginForm` and `SignupForm` in Task 5.

- [ ] **Step 1: Write the component**

```tsx
// components/auth/google-button.tsx
import { signInWithGoogle } from "@/lib/supabase/oauth-actions";
import { Button } from "@/components/ui/button";

// The standard 4-color Google "G" glyph — required by Google's branding
// guidelines for "Sign in with Google" buttons, not decorative.
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.84Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

export function GoogleButton({ next = "/" }: { next?: string }) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="next" value={next} />
      <Button type="submit" variant="outline" className="h-11 w-full gap-2">
        <GoogleIcon />
        Continuar con Google
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/auth/google-button.tsx
git commit -m "Add GoogleButton component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Form UI polish + wire in `GoogleButton`

**Files:**
- Modify: `app/login/login-form.tsx`
- Modify: `app/signup/signup-form.tsx`

**Interfaces:**
- Consumes: `GoogleButton` from Task 4.
- Produces: no interface change — both forms keep their existing exported component names/props (`LoginForm({ next })`, `SignupForm()`), only their internal JSX/classNames change, so `app/login/page.tsx`/`app/signup/page.tsx` need no changes here (they're updated in Task 8 for the layout, not for this).

- [ ] **Step 1: Update `LoginForm`**

Replace the full file:
```tsx
// app/login/login-form.tsx
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/auth/google-button";
import { signInWithPassword, type AuthActionState } from "./actions";

const initialState: AuthActionState = { error: null };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signInWithPassword, initialState);

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
            required
            className="h-11 rounded-xl border-0 shadow-sm"
          />
        </div>

        {state.error && <p className="text-sm text-destructive">{state.error}</p>}

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
```

- [ ] **Step 2: Update `SignupForm`**

Replace the full file:
```tsx
// app/signup/signup-form.tsx
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/auth/google-button";
import { signUp, type AuthActionState } from "./actions";

const initialState: AuthActionState = { error: null };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

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
            minLength={6}
            required
            className="h-11 rounded-xl border-0 shadow-sm"
          />
        </div>

        {state.error && <p className="text-sm text-destructive">{state.error}</p>}

        <Button type="submit" disabled={pending} className="mt-1 h-11">
          {pending ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        o continúa con
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton />

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit -p . && npx eslint app/login/login-form.tsx app/signup/signup-form.tsx components/auth/google-button.tsx`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/login/login-form.tsx app/signup/signup-form.tsx
git commit -m "Polish login/signup form inputs and add Google sign-in option

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: `DecorativeAuthMap` component

**Files:**
- Create: `components/auth/decorative-auth-map.tsx`

**Interfaces:**
- Consumes: `generateDecorativeDots` from `lib/auth/decorative-dots.ts` (Task 1), `BusinessPin` from `components/map-view/business-pin.tsx` (existing), `MapGL`/`Marker` from `react-map-gl/mapbox` (existing dependency, same import path `business-map.tsx` uses), `useTheme` from `next-themes` (existing).
- Produces: `DecorativeAuthMap()` — no props. Fills its parent via `className="h-full w-full"`; the parent (`AuthLayout`, Task 7) is responsible for absolute-positioning it.

- [ ] **Step 1: Write the component**

```tsx
// components/auth/decorative-auth-map.tsx
"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import MapGL, { Marker } from "react-map-gl/mapbox";
import { BusinessPin } from "@/components/map-view/business-pin";
import { generateDecorativeDots } from "@/lib/auth/decorative-dots";

const CDMX_CENTER = { lat: 19.4326, lng: -99.1332 };
const DOT_COUNT = 40;
const DOT_SEED = 42;

export function DecorativeAuthMap() {
  const { resolvedTheme } = useTheme();
  // Stable across re-renders (theme toggles, parent resizes) so the dots
  // never visibly "jump" — only computed once per mount.
  const dots = useMemo(() => generateDecorativeDots(DOT_COUNT, DOT_SEED), []);

  return (
    <MapGL
      initialViewState={{ latitude: CDMX_CENTER.lat, longitude: CDMX_CENTER.lng, zoom: 12 }}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      mapStyle={resolvedTheme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11"}
      style={{ width: "100%", height: "100%" }}
      interactive={false}
      dragPan={false}
      dragRotate={false}
      scrollZoom={false}
      doubleClickZoom={false}
      touchZoomRotate={false}
      touchPitch={false}
      keyboard={false}
      attributionControl={false}
    >
      {dots.map((dot, i) => (
        <Marker key={i} latitude={dot.lat} longitude={dot.lng}>
          <BusinessPin />
        </Marker>
      ))}
    </MapGL>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/auth/decorative-auth-map.tsx
git commit -m "Add decorative frozen CDMX map for the desktop auth layout

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: `AuthLayout` component

**Files:**
- Create: `components/auth/auth-layout.tsx`

**Interfaces:**
- Consumes: `useIsDesktop` from `hooks/use-media-query.ts` (existing), `DecorativeAuthMap` from Task 6.
- Produces: `AuthLayout({ children }: { children: React.ReactNode })` — wraps a page's card content (heading + subtext + form, exactly what `login/page.tsx`/`signup/page.tsx` render inside their card `div` today). Used by Task 8.

- [ ] **Step 1: Write the component**

```tsx
// components/auth/auth-layout.tsx
"use client";

import type { ReactNode } from "react";
import { useIsDesktop } from "@/hooks/use-media-query";
import { DecorativeAuthMap } from "./decorative-auth-map";

export function AuthLayout({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop();

  if (!isDesktop) {
    return (
      <main className="flex min-h-dvh w-full items-center justify-center bg-sheet px-4">
        <div className="w-full max-w-sm rounded-2xl bg-popover p-6 shadow-soft">{children}</div>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-sheet">
      <div className="absolute inset-0 z-0">
        <DecorativeAuthMap />
      </div>
      <div className="absolute top-1/2 right-16 z-10 w-full max-w-sm -translate-y-1/2 rounded-2xl bg-popover p-8 shadow-soft">
        {children}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/auth/auth-layout.tsx
git commit -m "Add AuthLayout with desktop floating-card + map, mobile unchanged

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: Wire pages to `AuthLayout` + manual verification

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `app/signup/page.tsx`

**Interfaces:**
- Consumes: `AuthLayout` from Task 7.
- Produces: final page output — no other file depends on these.

- [ ] **Step 1: Update `login/page.tsx`**

Replace the full file:
```tsx
// app/login/page.tsx
import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/";

  return (
    <AuthLayout>
      <h1 className="mb-1 text-lg font-semibold text-foreground">Inicia sesión</h1>
      <p className="mb-6 text-sm text-muted-foreground">Encuentra clientes potenciales cerca de ti.</p>
      <LoginForm next={next} />
    </AuthLayout>
  );
}
```

- [ ] **Step 2: Update `signup/page.tsx`**

Replace the full file:
```tsx
// app/signup/page.tsx
import { Mail } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { SignupForm } from "./signup-form";

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  const sent = params.sent === "1";

  return (
    <AuthLayout>
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="size-6" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Revisa tu correo</h1>
          <p className="text-sm text-muted-foreground">
            Te enviamos un enlace de confirmación. Ábrelo para activar tu cuenta.
          </p>
        </div>
      ) : (
        <>
          <h1 className="mb-1 text-lg font-semibold text-foreground">Crea tu cuenta</h1>
          <p className="mb-6 text-sm text-muted-foreground">Encuentra clientes potenciales cerca de ti.</p>
          <SignupForm />
        </>
      )}
    </AuthLayout>
  );
}
```

- [ ] **Step 3: Typecheck and lint the whole changed surface**

Run: `npx tsc --noEmit -p . && npx eslint app/login app/signup components/auth lib/auth lib/supabase/oauth-actions.ts`
Expected: no errors

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass, including the 4 new ones from Task 1

- [ ] **Step 5: Manual browser verification**

Using the Browser pane (dev server already running per `.claude/launch.json`):
1. Navigate to `/login` at a desktop viewport width (≥1024px) in both light and dark mode (via `resize_window`'s `colorScheme`) — confirm the floating card sits over a frozen CDMX map with scattered blue pins, no pan/zoom/drag responds to interaction.
2. Resize to mobile width (`resize_window preset: "mobile"`) — confirm it falls back to the plain centered card, no map, matching today's layout structure with the new polished inputs/divider/Google button.
3. Repeat both checks on `/signup`.
4. Confirm the "Continuar con Google" button renders correctly on both pages, but do not click through (that needs live Google Cloud credentials, handled separately with the user after this task).

- [ ] **Step 6: Commit**

```bash
git add app/login/page.tsx app/signup/page.tsx
git commit -m "Wire login/signup pages to the new AuthLayout

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## After this plan

Once Task 8 is verified, walk the user through the manual Google Cloud + Supabase dashboard setup from the spec (§"Supabase + Google Cloud setup") so the button's redirect actually completes end to end.
