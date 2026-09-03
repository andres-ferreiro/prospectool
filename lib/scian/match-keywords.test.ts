import { describe, expect, it } from "vitest";
import { matchSuggestedKeywords } from "./match-keywords";

describe("matchSuggestedKeywords", () => {
  it("keeps phrases that match a real SCIAN category", () => {
    const result = matchSuggestedKeywords(["veterinarias", "bufetes jurídicos", "consultorios dentales"]);
    expect(result).toEqual(["veterinarias", "bufetes jurídicos", "consultorios dentales"]);
  });

  it("drops phrases with no resemblance to any SCIAN category", () => {
    const result = matchSuggestedKeywords(["servicios de teletransportación interdimensional"]);
    expect(result).toEqual([]);
  });

  it("filters a mixed list, keeping order of the survivors", () => {
    const result = matchSuggestedKeywords([
      "restaurantes",
      "servicios de teletransportación interdimensional",
      "farmacias",
    ]);
    expect(result).toEqual(["restaurantes", "farmacias"]);
  });

  it("returns an empty array for an empty input", () => {
    expect(matchSuggestedKeywords([])).toEqual([]);
  });
});
