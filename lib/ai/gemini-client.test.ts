import { describe, expect, it } from "vitest";
import { parseGeminiSuggestions } from "./gemini-client";

function geminiResponse(text: string) {
  return { candidates: [{ content: { parts: [{ text }] } }] };
}

describe("parseGeminiSuggestions", () => {
  it("parses a valid object with keywords, scianCodes, and projectName", () => {
    const result = parseGeminiSuggestions(
      geminiResponse(
        '{"keywords": ["restaurantes", "cafeterías"], "scianCodes": ["722511", "722512"], "projectName": "Restaurantes CDMX"}'
      )
    );
    expect(result).toEqual({
      keywords: ["restaurantes", "cafeterías"],
      scianCodes: ["722511", "722512"],
      projectName: "Restaurantes CDMX",
    });
  });

  it("drops non-string entries from each array", () => {
    const result = parseGeminiSuggestions(
      geminiResponse('{"keywords": ["restaurantes", 5, null], "scianCodes": ["722511", 42]}')
    );
    expect(result).toEqual({ keywords: ["restaurantes"], scianCodes: ["722511"], projectName: "" });
  });

  it("defaults a missing field to an empty array/string instead of throwing", () => {
    const result = parseGeminiSuggestions(geminiResponse('{"keywords": ["restaurantes"]}'));
    expect(result).toEqual({ keywords: ["restaurantes"], scianCodes: [], projectName: "" });
  });

  it("returns all fields empty when the object has none of the keys", () => {
    const result = parseGeminiSuggestions(geminiResponse("{}"));
    expect(result).toEqual({ keywords: [], scianCodes: [], projectName: "" });
  });

  it("trims and truncates a too-long projectName to 40 characters", () => {
    const longName = "  " + "Despachos contables independientes en toda la Ciudad de México  ";
    const result = parseGeminiSuggestions(geminiResponse(JSON.stringify({ projectName: longName })));
    expect(result.projectName).toHaveLength(40);
    expect(result.projectName.startsWith(" ")).toBe(false);
  });

  it("ignores a non-string projectName", () => {
    const result = parseGeminiSuggestions(geminiResponse('{"projectName": 123}'));
    expect(result.projectName).toBe("");
  });

  it("throws if the response has no candidates", () => {
    expect(() => parseGeminiSuggestions({ candidates: [] })).toThrow();
  });

  it("throws if the text is not valid JSON", () => {
    expect(() => parseGeminiSuggestions(geminiResponse("not json"))).toThrow();
  });

  it("throws if the parsed JSON is an array, not an object", () => {
    expect(() => parseGeminiSuggestions(geminiResponse('["restaurantes"]'))).toThrow();
  });

  it("throws if the parsed JSON is null", () => {
    expect(() => parseGeminiSuggestions(geminiResponse("null"))).toThrow();
  });
});
