import { SCIAN_CATALOG } from "./catalog";

// Strips accents/case so "jurídicos" and "veterinarias" compare cleanly
// against catalog titles that use full, differently-inflected Spanish.
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Words shorter than this are too generic ("de", "para", "sector") to be
// useful signals for a match.
const MIN_WORD_LENGTH = 4;
// Comparing word prefixes rather than whole words tolerates Spanish
// gender/number inflection ("veterinarias" vs. catalog's "veterinarios")
// without needing a real stemmer for this filtering guard.
const PREFIX_LENGTH = 6;

function significantWordPrefixes(phrase: string): string[] {
  return normalize(phrase)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= MIN_WORD_LENGTH)
    .map((word) => word.slice(0, PREFIX_LENGTH));
}

const CATALOG_TITLES_NORMALIZED = SCIAN_CATALOG.map((entry) => normalize(entry.title));

// Filters a model's suggested keyword phrases down to the ones that
// plausibly correspond to a real SCIAN category — a guard against the
// model hallucinating a business type that would return zero DENUE
// results. Deliberately lenient (substring-of-title on word prefixes)
// rather than an exact match, since suggested phrases are meant to be
// short DENUE-style search terms, not verbatim catalog titles.
export function matchSuggestedKeywords(suggested: string[]): string[] {
  return suggested.filter((phrase) => {
    const prefixes = significantWordPrefixes(phrase);
    if (prefixes.length === 0) return false;
    return prefixes.every((prefix) =>
      CATALOG_TITLES_NORMALIZED.some((title) => title.includes(prefix))
    );
  });
}
