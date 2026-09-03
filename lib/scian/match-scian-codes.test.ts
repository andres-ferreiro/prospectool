import { describe, expect, it } from "vitest";
import { matchSuggestedScianCodes } from "./match-scian-codes";

// All real codes, verified present in lib/scian/catalog.ts.
const REAL_CODES = [
  "722511", // Restaurantes con servicio de preparación de alimentos a la carta o de comida corrida
  "722512", // Restaurantes con servicio de preparación de pescados y mariscos
  "722513", // Restaurantes con servicio de preparación de antojitos
  "722514", // Restaurantes con servicio de preparación de tacos y tortas
  "722516", // Restaurantes de autoservicio
  "541941", // Servicios veterinarios para mascotas prestados por el sector privado
  "111110", // Cultivo de soya
  "461110", // Comercio al por menor en tiendas de abarrotes, ultramarinos y misceláneas
  "621111", // Consultorios de medicina general del sector privado
  "812110", // Salones y clínicas de belleza y peluquerías
];

describe("matchSuggestedScianCodes", () => {
  it("keeps codes that exist in the real catalog", () => {
    const result = matchSuggestedScianCodes(["722511", "541941"]);
    expect(result).toEqual(["722511", "541941"]);
  });

  it("drops codes that don't exist in the catalog", () => {
    const result = matchSuggestedScianCodes(["722511", "999999", "541941"]);
    expect(result).toEqual(["722511", "541941"]);
  });

  it("deduplicates repeated codes", () => {
    const result = matchSuggestedScianCodes(["722511", "722511", "541941"]);
    expect(result).toEqual(["722511", "541941"]);
  });

  it("caps the result at 8 entries", () => {
    const result = matchSuggestedScianCodes(REAL_CODES);
    expect(result).toHaveLength(8);
    expect(result).toEqual(REAL_CODES.slice(0, 8));
  });

  it("returns an empty array for an empty input", () => {
    expect(matchSuggestedScianCodes([])).toEqual([]);
  });
});
