import { cookies } from "next/headers";

// The email being verified has to survive the hop from the form that asked for
// a code to the form that redeems it. It is personal data, so it travels in an
// httpOnly cookie rather than a query string — a URL would leak it into browser
// history, the Referer header, and any analytics that records paths.
const MAX_AGE_SECONDS = 30 * 60;

export type PendingEmailScope = "signup" | "recovery";

const COOKIE_NAMES: Record<PendingEmailScope, string> = {
  signup: "pt_pending_signup_email",
  recovery: "pt_pending_recovery_email",
};

export async function setPendingEmail(scope: PendingEmailScope, email: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAMES[scope], email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getPendingEmail(scope: PendingEmailScope): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAMES[scope])?.value ?? null;
}

export async function clearPendingEmail(scope: PendingEmailScope): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAMES[scope]);
}
