// DENUE data comes back SHOUTING IN ALL CAPS — this is purely a display
// transform, the underlying value is left untouched.
//
// Split on whitespace rather than using a \b-based regex: JS's \b only
// treats [A-Za-z0-9_] as "word" characters, so accented letters (á, é, í...)
// create spurious boundaries mid-word (e.g. "juárez" -> "juÁrez").
export function toTitleCase(input: string): string {
  return input
    .toLowerCase()
    .split(" ")
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}
