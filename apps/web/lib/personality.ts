export const FIVE_FACTOR_SLUG = "five-factor-profile";

export type PersonalityPoles = {
  low: string;
  high: string;
};

export const PERSONALITY_TRAITS = [
  {
    id: "openness",
    label: "Openness",
    poles: { low: "Concrete", high: "Curious" },
    detail: "Curiosity, new methods, and interest in ideas.",
  },
  {
    id: "conscientiousness",
    label: "Conscientiousness",
    poles: { low: "Loose", high: "Orderly" },
    detail: "Follow-through, order, and how you finish work.",
  },
  {
    id: "extraversion",
    label: "Extraversion",
    poles: { low: "Quiet", high: "Outgoing" },
    detail: "Energy with people versus restoration in quiet.",
  },
  {
    id: "agreeableness",
    label: "Agreeableness",
    poles: { low: "Candid", high: "Easygoing" },
    detail: "Trust, patience, and how you handle disagreement.",
  },
  {
    id: "stability",
    label: "Emotional stability",
    poles: { low: "Reactive", high: "Steady" },
    detail: "How quickly you settle after stress or a mistake.",
  },
] as const;

const TRAIT_POLES: Record<string, PersonalityPoles> = Object.fromEntries(
  PERSONALITY_TRAITS.map((trait) => [trait.id, trait.poles]),
);

const TRAIT_BAND_COPY: Record<string, Record<string, string>> = {
  openness: {
    lower:
      "You described yourself as sticking with methods that already work. A new idea is welcome when it clearly earns its place.",
    typical:
      "You mix a familiar path with the occasional new one. Abstract talk holds you when it is useful, not for its own sake.",
    higher:
      "You described looking for a new way through familiar work, and staying with ideas even when they stay abstract.",
  },
  conscientiousness: {
    lower:
      "You described leaving details for later and letting small tasks pile up. Follow-through shows up when it has to.",
    typical:
      "You keep most commitments and tidy the rest in bursts. Planning is there, without turning the week into a script.",
    higher:
      "You described finishing the unglamorous last step and planning the week before it starts, even when nobody is watching.",
  },
  extraversion: {
    lower:
      "You described a quiet evening as more restoring than a gathering. You wait to be invited in more often than you speak first.",
    typical:
      "People restore you some of the time, and solitude does the rest. You speak up in a room when the moment is clear.",
    higher:
      "You described feeling more alive after time with a group, speaking early among people you do not know, and looking for someone new.",
  },
  agreeableness: {
    lower:
      "You described keeping score when someone lets you down, and preferring to win the point rather than keep the peace.",
    typical:
      "You give people room until they use it up. You look for a liveable outcome without dropping what you actually think.",
    higher:
      "You described assuming people mean well, giving the benefit of the doubt, and looking for a way both sides can live with.",
  },
  stability: {
    lower:
      "You described a small mistake staying with you, and turning over at night things you cannot fix.",
    typical:
      "Stress lands, then it leaves. You can put a worry down most days, with the odd evening that takes longer.",
    higher:
      "You described staying even-tempered when plans change, recovering after embarrassment, and picking the work back up.",
  },
};

export function personalityPoles(facetId: string): PersonalityPoles | null {
  return TRAIT_POLES[facetId] ?? null;
}

export function hasPersonalityFacets(score: unknown): boolean {
  if (!score || typeof score !== "object" || !("facets" in score)) {
    return false;
  }
  const facets = score.facets;
  return Array.isArray(facets) && facets.length > 0;
}

export function personalityBandCopy(
  facetId: string,
  bandId: string | undefined,
): string | null {
  if (!bandId) {
    return null;
  }
  return TRAIT_BAND_COPY[facetId]?.[bandId] ?? null;
}

export type PersonalityAssessment = {
  id: string;
  slug: string;
  status: string;
  completedAt: string | null;
  score: {
    facets?: Array<{
      id: string;
      label: string;
      raw: number;
      min: number;
      max: number;
      pomp: number;
      band: { id: string; label: string } | null;
    }>;
  } | null;
};

function completedAtMs(row: PersonalityAssessment) {
  return row.completedAt ? new Date(row.completedAt).getTime() : 0;
}

/** Newest five-factor result, preferring one that already has trait facets. */
export function pickLatestPersonality(
  rows: PersonalityAssessment[],
): PersonalityAssessment | null {
  const completed = rows
    .filter(
      (row) =>
        row.slug === FIVE_FACTOR_SLUG &&
        row.status === "completed" &&
        row.score,
    )
    .sort((left, right) => completedAtMs(right) - completedAtMs(left));
  return (
    completed.find((row) => hasPersonalityFacets(row.score)) ??
    completed[0] ??
    null
  );
}

export function personalityFacetPercent(facet: {
  raw: number;
  min: number;
  max: number;
}) {
  const span = Math.max(1, facet.max - facet.min);
  return Math.min(100, Math.max(0, ((facet.raw - facet.min) / span) * 100));
}
