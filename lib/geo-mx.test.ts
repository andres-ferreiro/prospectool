import { describe, expect, it } from "vitest";
import { matchEntidadMunicipio } from "./geo-mx";

describe("matchEntidadMunicipio", () => {
  it("matches an exact region and place name", () => {
    const result = matchEntidadMunicipio("Ciudad de México", "Coyoacán");
    expect(result).toEqual({ entidad: "09", municipio: "003" });
  });

  it("fuzzy-matches a Mapbox region name against a longer INEGI name", () => {
    // Mapbox's "Coahuila" vs. INEGI's official "Coahuila de Zaragoza".
    const result = matchEntidadMunicipio("Coahuila", null);
    expect(result).toEqual({ entidad: "05", municipio: null });
  });

  it("returns entidad with a null municipio when the place doesn't match any real municipio in that entidad", () => {
    const result = matchEntidadMunicipio("Ciudad de México", "Nonexistent Place XYZ");
    expect(result).toEqual({ entidad: "09", municipio: null });
  });

  it("returns both null when the region doesn't match any real entidad", () => {
    const result = matchEntidadMunicipio("Nonexistent Region XYZ", "Coyoacán");
    expect(result).toEqual({ entidad: null, municipio: null });
  });

  it("returns both null when the region is null", () => {
    const result = matchEntidadMunicipio(null, null);
    expect(result).toEqual({ entidad: null, municipio: null });
  });
});
