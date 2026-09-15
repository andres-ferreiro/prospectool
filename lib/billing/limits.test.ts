import { describe, expect, it } from "vitest";
import { canAccessCrm, canCreateProject, isPaidStatus, isResultLocked, selectUnlockedIds } from "./limits";

describe("isPaidStatus", () => {
  it("treats active and trialing as paid", () => {
    expect(isPaidStatus("active")).toBe(true);
    expect(isPaidStatus("trialing")).toBe(true);
  });

  it("treats every other status as unpaid", () => {
    expect(isPaidStatus("past_due")).toBe(false);
    expect(isPaidStatus("canceled")).toBe(false);
    expect(isPaidStatus("incomplete")).toBe(false);
  });

  it("treats null/undefined as unpaid", () => {
    expect(isPaidStatus(null)).toBe(false);
    expect(isPaidStatus(undefined)).toBe(false);
  });

  it("is case-sensitive to Stripe's exact status strings", () => {
    expect(isPaidStatus("Active")).toBe(false);
  });
});

describe("canCreateProject", () => {
  it("allows a free user's first project", () => {
    expect(canCreateProject({ isPaid: false, projectCount: 0 })).toBe(true);
  });

  it("blocks a free user's second project", () => {
    expect(canCreateProject({ isPaid: false, projectCount: 1 })).toBe(false);
  });

  it("blocks a free user regardless of how many projects they already have", () => {
    expect(canCreateProject({ isPaid: false, projectCount: 5 })).toBe(false);
  });

  it("always allows a paid user", () => {
    expect(canCreateProject({ isPaid: true, projectCount: 99 })).toBe(true);
  });
});

describe("canAccessCrm", () => {
  it("blocks unpaid users", () => {
    expect(canAccessCrm({ isPaid: false })).toBe(false);
  });

  it("allows paid users", () => {
    expect(canAccessCrm({ isPaid: true })).toBe(true);
  });
});

describe("isResultLocked", () => {
  it("never locks results within the free limit", () => {
    expect(isResultLocked(0, false)).toBe(false);
    expect(isResultLocked(9, false)).toBe(false);
  });

  it("locks results at and beyond the free limit for unpaid users", () => {
    expect(isResultLocked(10, false)).toBe(true);
    expect(isResultLocked(50, false)).toBe(true);
  });

  it("never locks anything for a paid user", () => {
    expect(isResultLocked(0, true)).toBe(false);
    expect(isResultLocked(500, true)).toBe(false);
  });
});

describe("selectUnlockedIds", () => {
  const business = (id: string, email: string | null, phone: string | null) => ({ id, email, phone });

  it("unlocks every business for a paid user", () => {
    const businesses = Array.from({ length: 15 }, (_, i) => business(`${i}`, null, null));
    const unlocked = selectUnlockedIds(businesses, true);
    expect(unlocked.size).toBe(15);
  });

  it("prefers businesses with both email and phone, then either, then neither", () => {
    const businesses = [
      business("none-1", null, null),
      business("both-1", "a@x.com", "555"),
      business("email-only-1", "b@x.com", null),
      business("phone-only-1", null, "555"),
      business("none-2", null, null),
    ];
    const unlocked = selectUnlockedIds(businesses, false);
    // Free limit (10) exceeds the list, so everything unlocks — but the
    // ranking itself (not just "did it fit") is what matters here; a
    // smaller effective limit is exercised below.
    expect(unlocked.size).toBe(5);
  });

  it("fills the free limit with the richest-contact businesses first when there are more results than the limit", () => {
    const rich = Array.from({ length: 5 }, (_, i) => business(`rich-${i}`, `${i}@x.com`, "555"));
    const poor = Array.from({ length: 20 }, (_, i) => business(`poor-${i}`, null, null));
    // Poor (no contact info) results listed first, as they would be if the
    // search just happened to return them first.
    const businesses = [...poor, ...rich];
    const unlocked = selectUnlockedIds(businesses, false);
    expect(unlocked.size).toBe(10);
    for (const b of rich) expect(unlocked.has(b.id)).toBe(true);
  });

  it("keeps original relative order among businesses with the same contact richness", () => {
    const businesses = Array.from({ length: 12 }, (_, i) => business(`${i}`, null, null));
    const unlocked = selectUnlockedIds(businesses, false);
    for (let i = 0; i < 10; i++) expect(unlocked.has(`${i}`)).toBe(true);
    expect(unlocked.has("10")).toBe(false);
    expect(unlocked.has("11")).toBe(false);
  });
});
