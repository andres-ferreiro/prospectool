import { SCIAN_CATALOG } from "./catalog";

const VALID_CODES = new Set(SCIAN_CATALOG.map((entry) => entry.code));
const MAX_CODES = 8;

// Filters a model's suggested SCIAN codes down to ones that actually exist
// in the real catalog — a hard guard against the model hallucinating a
// code, since these feed Advanced Search's precise class-level query
// rather than DENUE's forgiving free-text search (unlike keyword
// suggestions, there's no "close enough" here: a wrong code returns
// results for the wrong business entirely).
export function matchSuggestedScianCodes(suggested: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const code of suggested) {
    if (!VALID_CODES.has(code)) continue;
    if (seen.has(code)) continue;
    seen.add(code);
    result.push(code);
    if (result.length >= MAX_CODES) break;
  }
  return result;
}
