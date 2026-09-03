import { describe, expect, it } from "vitest";
import { matchSuggestedKeywords } from "./match-keywords";
import { QUICK_PICK_KEYWORDS } from "./quick-picks";

describe("matchSuggestedKeywords", () => {
  it("keeps phrases that match a real SCIAN category", () => {
    // "veterinarias" and "consultorios dentales" also happen to be quick
    // picks, so they come back canonicalized to their pill spelling;
    // "bufetes jurídicos" isn't a quick pick (only "Despachos jurídicos"
    // is) so it survives via the catalog-title prefix match unchanged.
    const result = matchSuggestedKeywords(["veterinarias", "bufetes jurídicos", "consultorios dentales"]);
    expect(result).toEqual(["Veterinarias", "bufetes jurídicos", "Consultorios dentales"]);
  });

  it("drops phrases with no resemblance to any SCIAN category", () => {
    const result = matchSuggestedKeywords(["xilografía esotérica cuántica"]);
    expect(result).toEqual([]);
  });

  it("filters a mixed list, keeping order of the survivors", () => {
    const result = matchSuggestedKeywords([
      "restaurantes",
      "xilografía esotérica cuántica",
      "farmacias",
    ]);
    expect(result).toEqual(["Restaurantes", "Farmacias"]);
  });

  it("returns an empty array for an empty input", () => {
    expect(matchSuggestedKeywords([])).toEqual([]);
  });

  it("accepts every QUICK_PICK_KEYWORDS entry — the prompt's own style examples", () => {
    const result = matchSuggestedKeywords(QUICK_PICK_KEYWORDS);
    for (const keyword of QUICK_PICK_KEYWORDS) {
      expect(result).toContain(keyword);
    }
  });

  it("canonicalizes a case-different quick-pick suggestion to its pill spelling", () => {
    const result = matchSuggestedKeywords(["restaurantes"]);
    expect(result).toEqual(["Restaurantes"]);
  });

  it("accepts a phrase whose prefix only partially matches a catalog title", () => {
    // "talleres mecánicos" is a quick pick with colloquial phrasing that
    // wouldn't necessarily satisfy an `every`-prefix catalog match; this
    // pins the `some`/`some` matching behavior independent of the
    // quick-pick shortcut.
    const result = matchSuggestedKeywords(["talleres mecánicos"]);
    expect(result).toEqual(["Talleres mecánicos"]);
  });

  it("deduplicates repeated suggestions, including case/accent variants", () => {
    const result = matchSuggestedKeywords(["restaurantes", "Restaurantes", "farmacias", "farmacias"]);
    expect(result).toEqual(["Restaurantes", "Farmacias"]);
  });
});
