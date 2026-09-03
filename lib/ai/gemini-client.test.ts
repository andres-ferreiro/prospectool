import { describe, expect, it } from "vitest";
import { parseGeminiKeywords } from "./gemini-client";

function geminiResponse(text: string) {
  return { candidates: [{ content: { parts: [{ text }] } }] };
}

describe("parseGeminiKeywords", () => {
  it("parses a valid JSON array of strings from the response text", () => {
    const result = parseGeminiKeywords(geminiResponse('["restaurantes", "cafeterías"]'));
    expect(result).toEqual(["restaurantes", "cafeterías"]);
  });

  it("drops non-string entries from the array", () => {
    const result = parseGeminiKeywords(geminiResponse('["restaurantes", 5, null]'));
    expect(result).toEqual(["restaurantes"]);
  });

  it("throws if the response has no candidates", () => {
    expect(() => parseGeminiKeywords({ candidates: [] })).toThrow();
  });

  it("throws if the text is not valid JSON", () => {
    expect(() => parseGeminiKeywords(geminiResponse("not json"))).toThrow();
  });

  it("throws if the parsed JSON is not an array", () => {
    expect(() => parseGeminiKeywords(geminiResponse('{"foo": "bar"}'))).toThrow();
  });
});
