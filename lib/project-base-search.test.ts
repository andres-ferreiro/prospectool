import { describe, expect, it } from "vitest";
import { hasCategorySearch, parseBaseSearch, parseScianCodes } from "./project-base-search";

describe("parseBaseSearch", () => {
  it("accepts a full base search", () => {
    expect(
      parseBaseSearch({
        center: { lat: 25.67, lng: -100.31 },
        radiusM: 1500,
        entidad: "19",
        municipio: "039",
        scianCodes: ["722511", "722515"],
      })
    ).toEqual({
      center: { lat: 25.67, lng: -100.31 },
      radiusM: 1500,
      entidad: "19",
      municipio: "039",
      scianCodes: ["722511", "722515"],
    });
  });

  it("defaults radius and allows a codes-only search with no location yet", () => {
    expect(parseBaseSearch({ scianCodes: ["722511"] })).toEqual({
      center: null,
      radiusM: 1500,
      entidad: null,
      municipio: null,
      scianCodes: ["722511"],
    });
  });

  it("rejects malformed coordinates, radius, or INEGI codes", () => {
    expect(parseBaseSearch(null)).toBeNull();
    expect(parseBaseSearch({ center: { lat: "25", lng: -100 } })).toBeNull();
    expect(parseBaseSearch({ center: { lat: 125, lng: -100 } })).toBeNull();
    expect(parseBaseSearch({ radiusM: 999999 })).toBeNull();
    expect(parseBaseSearch({ entidad: "Nuevo León" })).toBeNull();
    expect(parseBaseSearch({ municipio: "39" })).toBeNull();
  });
});

describe("parseScianCodes", () => {
  it("keeps only unique 6-digit codes", () => {
    expect(parseScianCodes(["722511", "722511", "abc", 722515, "7225"])).toEqual(["722511"]);
    expect(parseScianCodes("722511")).toEqual([]);
  });
});

describe("hasCategorySearch", () => {
  it("requires codes and a resolved municipio", () => {
    const base = { center: null, radiusM: 1500, entidad: "19", municipio: "039", scianCodes: ["722511"] };
    expect(hasCategorySearch(base)).toBe(true);
    expect(hasCategorySearch({ ...base, municipio: null })).toBe(false);
    expect(hasCategorySearch({ ...base, scianCodes: [] })).toBe(false);
    expect(hasCategorySearch(null)).toBe(false);
  });
});
