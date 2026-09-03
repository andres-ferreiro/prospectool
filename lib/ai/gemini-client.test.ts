import { describe, expect, it } from "vitest";
import { parseGeminiSuggestions } from "./gemini-client";

function geminiResponse(text: string) {
  return { candidates: [{ content: { parts: [{ text }] } }] };
}

describe("parseGeminiSuggestions", () => {
  it("parses a valid object with both keywords and scianCodes", () => {
    const result = parseGeminiSuggestions(
      geminiResponse('{"keywords": ["restaurantes", "cafeterías"], "scianCodes": ["722511", "722512"]}')
    );
    expect(result).toEqual({
      keywords: ["restaurantes", "cafeterías"],
      scianCodes: ["722511", "722512"],
    });
  });

  it("drops non-string entries from each array", () => {
    const result = parseGeminiSuggestions(
      geminiResponse('{"keywords": ["restaurantes", 5, null], "scianCodes": ["722511", 42]}')
    );
    expect(result).toEqual({ keywords: ["restaurantes"], scianCodes: ["722511"] });
  });

  it("defaults a missing field to an empty array instead of throwing", () => {
    const result = parseGeminiSuggestions(geminiResponse('{"keywords": ["restaurantes"]}'));
    expect(result).toEqual({ keywords: ["restaurantes"], scianCodes: [] });
  });

  it("returns both fields empty when the object has neither key", () => {
    const result = parseGeminiSuggestions(geminiResponse("{}"));
    expect(result).toEqual({ keywords: [], scianCodes: [] });
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
