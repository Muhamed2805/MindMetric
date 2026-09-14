import { FIVE_FACTOR_SLUG, hasPersonalityFacets } from "./personality";

/** Results list copy. Development tables stay off this row so they are not read as ranks. */
export function scaleResultNote(input: {
  slug: string;
  score:
    | {
        band?: { label: string } | null;
        facets?: unknown;
      }
    | null
    | undefined;
}) {
  if (input.slug === FIVE_FACTOR_SLUG) {
    return hasPersonalityFacets(input.score)
      ? "Self-report profile"
      : "Retake for trait bars";
  }
  return input.score?.band?.label ?? "Keyed total";
}
