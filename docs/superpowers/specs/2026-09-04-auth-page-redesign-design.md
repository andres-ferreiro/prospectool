# Auth page redesign: polished form, Google sign-in, decorative map

## Goal

Redesign `/login` and `/signup`:

1. Polish the form UI (inputs, card, spacing) to match patterns already used
   elsewhere in the app instead of bare shadcn defaults.
2. Add "Sign in / Sign up with Google" alongside the existing email/password
   flow, plus the Supabase + Google Cloud setup to make it work.
3. On desktop, present the form as a floating card on the right, with a
   frozen decorative Mapbox view of CDMX (dots standing in for found
   businesses) filling the left/background. Mobile is unchanged (centered
   card on plain `bg-sheet`, no map).

## Breakpoint

Reuses the existing `useIsDesktop()` hook (`hooks/use-media-query.ts`,
`min-width: 1024px`) — same breakpoint the CRM Kanban/mobile-list split
already uses, so "desktop" means the same thing everywhere in the app.

## 1. Shared `AuthLayout`

New `components/auth/auth-layout.tsx`, a client component:

- **Mobile (`isDesktop === false`)**: identical to today —
  `<main className="flex min-h-dvh w-full items-center justify-center bg-sheet px-4">`
  wrapping the card. No map, no behavior change.
- **Desktop**: `<main className="relative min-h-dvh w-full overflow-hidden bg-sheet">`
  containing:
  - `<DecorativeAuthMap />` absolutely positioned `inset-0`, `z-0`.
  - The form card, positioned `absolute right-16 top-1/2 -translate-y-1/2 z-10 w-full max-w-sm`
    (a floating card over the map, right-aligned with margin — not a
    50/50 split layout, since the map should read as a full backdrop).

`/login/page.tsx` and `/signup/page.tsx` both switch from their current
inline `<main>` wrapper to `<AuthLayout>{...card content...}</AuthLayout>`,
keeping the same card content (heading, subtext, form) they render today.

## 2. Form UI polish

Applied inside the card content (both pages), no structural change to
`LoginForm`/`SignupForm`'s field list:

- Card shell: keep `rounded-2xl bg-popover shadow-soft`, bump padding
  slightly (`p-6` → `p-8` on desktop only, via the layout's card wrapper)
  since it now floats over a map instead of sitting on a plain background —
  needs a bit more visual weight.
- Inputs: add `className="h-11 rounded-xl border-0 shadow-sm"` to every
  `<Input>` in both forms — the same treatment already used by the CRM and
  map search bars (`components/crm/kanban-board.tsx` etc.), instead of the
  bare bordered default.
- Labels: unchanged (`Label` component, already consistent).
- Submit button: unchanged (`Button` default), but height bumped to `h-11`
  to match the new input height.
- New divider between the password form and the Google button: a plain
  `<div className="flex items-center gap-3 text-xs text-muted-foreground">`
  with two `flex-1 border-t border-border` lines and the text "o continúa
  con" — Spanish, matching the rest of the app's copy.

## 3. Google OAuth

### Code

- New shared server action, `signInWithGoogle`, in a new
  `lib/supabase/oauth-actions.ts` (imported by both `app/login/actions.ts`
  and `app/signup/actions.ts` — OAuth sign-in and sign-up are the same
  Supabase call, it auto-creates the account on first login):

  ```ts
  "use server";
  export async function signInWithGoogle(formData: FormData) {
    const next = String(formData.get("next") ?? "/");
    const supabase = await createSupabaseServerClient();
    const origin = (await headers()).get("origin");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) throw new Error(error?.message ?? "No se pudo iniciar sesión con Google");
    redirect(data.url);
  }
  ```

  Takes a plain `FormData` (not a bound arg) so it matches
  `signInWithPassword`'s existing convention of reading `next` from a
  hidden `<input type="hidden" name="next">` — same shape, no
  `.bind()`-style deviation.
- `app/auth/callback/route.ts` already exchanges the code for a session and
  redirects — extend it to honor a `next` query param (falls back to `/`,
  matching `LoginForm`'s existing `next` prop) instead of always `/`.
- New `GoogleButton` client component (`components/auth/google-button.tsx`),
  taking a `next: string` prop (defaults to `"/"` — signup's page doesn't
  track a `next` at all today): a `<form action={signInWithGoogle}>` with
  a hidden `next` input, wrapping a single submit `<Button variant="outline">`
  with an inline Google "G" SVG icon (the standard 4-color G glyph) and the
  label "Continuar con Google" — same label on both login and signup pages,
  since the underlying action is identical either way.
- Error handling: `signInWithGoogle` throwing surfaces via Next's default
  error boundary (rare path — misconfigured provider — not worth a custom
  inline error state like the password form has, since there's no form
  state to preserve).

### Supabase + Google Cloud setup (manual, walked through separately)

Not code — steps I'll hand you when we get to this part:
1. Create an OAuth client in Google Cloud Console (Web application type).
2. Set its Authorized redirect URI to your Supabase project's
   `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Paste the resulting Client ID/Secret into Supabase Dashboard → Auth →
   Providers → Google, and enable it.

## 4. Decorative map

New `components/auth/decorative-auth-map.tsx`, client component:

- Same `react-map-gl/mapbox` `<MapGL>` this app already uses elsewhere,
  centered on CDMX (`lng: -99.1332, lat: 19.4326`), fixed `zoom: 12`.
- All interaction disabled: `dragPan={false} scrollZoom={false} dragRotate={false} doubleClickZoom={false} touchZoomRotate={false} touchPitch={false} keyboard={false}`,
  and `interactive={false}` where supported — a frozen view, not a
  functioning map widget.
- Style follows the existing theme pattern: `useTheme()` →
  `mapbox://styles/mapbox/{dark-v11|light-v11}`, same as
  `business-map.tsx`.
- Dots: a fixed (seeded, not `Math.random()` per render) array of ~40
  `{ lng, lat }` points jittered around the CDMX center, rendered as
  `<Marker>` pins reusing the existing `DEFAULT_PIN_COLOR` (`#0a84ff`) dot
  style from `business-map.tsx` (small filled circle, no popup/click
  handler — purely decorative).
- No Mapbox `Source`/clustering layer needed at this scale (~40 fixed
  points) — plain `<Marker>` elements are simpler and match how a handful
  of pins are already rendered elsewhere in the codebase.

## Testing

- `tsc`/eslint across all new/changed files, as usual.
- The map/layout/theme-switching is visually verifiable in the Browser
  pane (desktop viewport, light and dark).
- The Google OAuth round-trip itself cannot be verified by me — it needs
  your real Google Cloud credentials and a live browser consent flow. I'll
  verify everything up to the redirect (button renders, action builds the
  right URL) and you'll do the final click-through once credentials are in
  place.

## Out of scope

- No changes to `LoginForm`/`SignupForm`'s validation logic or field set.
- No other OAuth providers (GitHub, etc.) — Google only, per the request.
- Mobile layout is unchanged — no map, no floating card, on small screens.
