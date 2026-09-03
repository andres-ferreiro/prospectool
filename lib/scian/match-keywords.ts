import { SCIAN_CATALOG } from "./catalog";
import { QUICK_PICK_KEYWORDS } from "./quick-picks";

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

// Map from normalized quick-pick text to its canonical (Title Case) spelling,
// so accepted suggestions that happen to be a quick pick can be re-rendered
// with the exact casing the keyword picker's pills use (avoids the picker
// treating "restaurantes" and "Restaurantes" as two different keywords).
const QUICK_PICK_BY_NORMALIZED = new Map(
  QUICK_PICK_KEYWORDS.map((keyword) => [normalize(keyword), keyword])
);

// Filters a model's suggested keyword phrases down to the ones that
// plausibly correspond to a real SCIAN category — a guard against the
// model hallucinating a business type that would return zero DENUE
// results. Deliberately lenient (substring-of-title on word prefixes)
// rather than an exact match, since suggested phrases are meant to be
// short DENUE-style search terms, not verbatim catalog titles.
//
// A phrase is accepted if EITHER:
//   - it's one of the app's own vetted QUICK_PICK_KEYWORDS (these are
//     colloquial DENUE search terms, not formal SCIAN títulos, so they
//     wouldn't reliably pass the catalog-title check below — see the
//     file header comment in ./quick-picks), or
//   - any of its significant-word prefixes appears in any catalog title
//     (matching `some`/`some`, not `every`/`some`: a suggested phrase
//     like "talleres mecánicos" should survive even if only "talleres"
//     or only "mecánicos" resembles a real título, since suggestions are
//     short free-text search terms rather than verbatim catalog titles).
//
// Accepted phrases that match a quick pick are also canonicalized to that
// pick's exact spelling, and the final list is deduplicated, so the
// keyword picker never ends up with case-variant duplicates of the same
// term (e.g. "restaurantes" and "Restaurantes").
export function matchSuggestedKeywords(suggested: string[]): string[] {
  const accepted = suggested.filter((phrase) => {
    if (QUICK_PICK_BY_NORMALIZED.has(normalize(phrase))) return true;
    const prefixes = significantWordPrefixes(phrase);
    if (prefixes.length === 0) return false;
    return prefixes.some((prefix) =>
      CATALOG_TITLES_NORMALIZED.some((title) => title.includes(prefix))
    );
  });

  const canonicalized = accepted.map(
    (phrase) => QUICK_PICK_BY_NORMALIZED.get(normalize(phrase)) ?? phrase
  );

  const seen = new Set<string>();
  const deduplicated: string[] = [];
  for (const phrase of canonicalized) {
    const key = normalize(phrase);
    if (seen.has(key)) continue;
    seen.add(key);
    deduplicated.push(phrase);
  }
  return deduplicated;
}
