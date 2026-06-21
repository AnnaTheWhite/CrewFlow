// Deterministic, substring-based entity detection for the Owner Command
// Center "suggestions panel" — no AI/ML, no automatic record creation.
// This only ever *suggests*; linking a detected entity to a note is always
// a separate, explicit owner action (see ownerNotes.routes.ts PUT).

type NamedEntity = { id: number; name: string };
type EmployeeEntity = { id: number; firstName: string; lastName: string };

export type DetectedEntities = {
  customers: NamedEntity[];
  projects: NamedEntity[];
  employees: EmployeeEntity[];
};

// False-positive mitigations:
// 1. Word-boundary match, not raw substring — "Pet" won't match inside
//    "Pets", "Kov" won't match inside "Kovalski".
// 2. Unicode-aware boundaries (\p{L}/\p{N}) so accented names like "Kovács"
//    or "János" are bounded correctly — plain `\b` in JS regex doesn't
//    treat accented letters as word characters and would misfire.
// 3. Minimum 3-character name requirement — skips trivial/short names that
//    would otherwise match almost any text.
// 4. Each category capped at 10 matches — a defensive limit, not a product
//    feature, in case a company has many short, common-word-like names.
const MIN_NAME_LENGTH = 3;
const MAX_MATCHES_PER_CATEGORY = 10;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Phase 3.1 — normalizes away the differences a real owner's typing
// introduces but that shouldn't break a match: case, surrounding
// whitespace, and punctuation (commas, periods, apostrophes). Diacritics
// are deliberately preserved here ("Kovács" stays accented) — stripping
// them is handled separately by `isMentioned`'s case-insensitive regex,
// not by this normalizer.
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:'"()]/g, "");
}

function wordBoundaryTest(text: string, fragment: string): boolean {
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegex(fragment)}(?![\\p{L}\\p{N}])`,
    "iu"
  );
  return pattern.test(text);
}

// Phase 3.1 — case-insensitive (handled by the "i" flag), trims/strips
// punctuation before comparing, and falls back to partial (per-token)
// matching so "kovács" alone still matches a customer named "Kovács
// János" — not just the full name.
function isMentioned(text: string, name: string): boolean {
  const trimmedName = name.trim();
  if (trimmedName.length < MIN_NAME_LENGTH) return false;

  const normalizedText = normalize(text);

  if (wordBoundaryTest(normalizedText, normalize(trimmedName))) {
    return true;
  }

  // Partial match: any individual token of the name (long enough to be
  // meaningful) found as a whole word in the text.
  return trimmedName
    .split(/\s+/)
    .filter((token) => token.length >= MIN_NAME_LENGTH)
    .some((token) => wordBoundaryTest(normalizedText, normalize(token)));
}

export function detectEntities(
  text: string,
  customers: NamedEntity[],
  projects: NamedEntity[],
  employees: EmployeeEntity[]
): DetectedEntities {
  return {
    customers: customers
      .filter((c) => isMentioned(text, c.name))
      .slice(0, MAX_MATCHES_PER_CATEGORY),
    projects: projects
      .filter((p) => isMentioned(text, p.name))
      .slice(0, MAX_MATCHES_PER_CATEGORY),
    // Employees match on full name OR first name alone — "Peter should go
    // on Friday" should still surface Peter Kovács even though the note
    // never spells out the last name.
    employees: employees
      .filter(
        (e) =>
          isMentioned(text, `${e.firstName} ${e.lastName}`) ||
          isMentioned(text, e.firstName)
      )
      .slice(0, MAX_MATCHES_PER_CATEGORY),
  };
}
