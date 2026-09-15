// Pure gating rules — no imports, so this is the one billing module a
// client component may import directly (everything else touches Supabase
// or Stripe and is server-only).

export const PAID_STATUSES = ["active", "trialing"] as const; // 'trialing' counts: the yearly plan's 7-day trial is full access
export const FREE_PROJECT_LIMIT = 1;
export const FREE_RESULT_LIMIT = 10;

export function isPaidStatus(status: string | null | undefined): boolean {
  return status != null && (PAID_STATUSES as readonly string[]).includes(status);
}

export function canCreateProject(args: { isPaid: boolean; projectCount: number }): boolean {
  return args.isPaid || args.projectCount < FREE_PROJECT_LIMIT;
}

export function canAccessCrm(args: { isPaid: boolean }): boolean {
  return args.isPaid;
}

// Whether the business at this position in the (already-ordered) result set
// should be locked for a free user. Locked results still render — as a
// muted pin or a masked row, never removed from the array — so a free user
// can see the tool actually found more than the free limit, just not
// who/where they are. See business-map.tsx/business-list.tsx.
export function isResultLocked(index: number, isPaid: boolean): boolean {
  return !isPaid && index >= FREE_RESULT_LIMIT;
}

// 2 = both email and phone, 1 = either, 0 = neither — how worth showing off
// a free-tier business is, contact-wise.
function contactRichness(business: { email: string | null; phone: string | null }): number {
  return (business.email ? 1 : 0) + (business.phone ? 1 : 0);
}

// The free FREE_RESULT_LIMIT slots should go to whichever results actually
// have contact info — a free user who lands on 10 businesses with no phone
// or email has nothing to act on and no reason to believe paying unlocks
// anything better. `sort` is stable, so ties (same richness) keep their
// original relative order instead of being shuffled.
export function selectUnlockedIds<T extends { id: string; email: string | null; phone: string | null }>(
  businesses: T[],
  isPaid: boolean
): Set<string> {
  if (isPaid) return new Set(businesses.map((b) => b.id));
  const ranked = [...businesses].sort((a, b) => contactRichness(b) - contactRichness(a));
  return new Set(ranked.filter((_, i) => !isResultLocked(i, isPaid)).map((b) => b.id));
}

export interface LockedResultStats {
  locked: number;
  emails: number;
  phones: number;
}

// What's actually behind the lock, for the paywall's "here's what you're
// missing" pitch — counted from the real (already-fetched) rows rather than
// estimated, so the numbers on screen always match what unlocking would
// reveal for *this* search.
export function lockedResultStats(
  businesses: { id: string; email: string | null; phone: string | null }[],
  lockedIds: Set<string>
): LockedResultStats {
  let emails = 0;
  let phones = 0;
  for (const business of businesses) {
    if (!lockedIds.has(business.id)) continue;
    if (business.email) emails++;
    if (business.phone) phones++;
  }
  return { locked: lockedIds.size, emails, phones };
}
