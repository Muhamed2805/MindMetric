import type { LikertDefinition, LikertItem } from "@mindmetric/shared";
import { isLikertValue } from "@mindmetric/shared";

export const SCORING_MODEL = "ctt-v1" as const;

export type CttItemScore = {
  id: string;
  keyed: number;
};

export type CttBand = {
  id: string;
  label: string;
};

export type CttScore = {
  model: typeof SCORING_MODEL;
  raw: number;
  min: number;
  max: number;
  pomp: number;
  percentile: number | null;
  band: CttBand | null;
  normsKind: "development" | null;
  items: CttItemScore[];
};

export function keyedLikertScore(item: LikertItem, value: number) {
  if (item.reverse) {
    return item.scale.min + item.scale.max - value;
  }
  return value;
}

export function interpolatePercentile(
  score: number,
  points: { score: number; percentile: number }[],
) {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) {
    return null;
  }
  if (score <= first.score) {
    return first.percentile;
  }
  if (score >= last.score) {
    return last.percentile;
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const lower = points[index];
    const upper = points[index + 1];
    if (!lower || !upper || score < lower.score || score > upper.score) {
      continue;
    }
    if (upper.score === lower.score) {
      return upper.percentile;
    }
    const t = (score - lower.score) / (upper.score - lower.score);
    return lower.percentile + t * (upper.percentile - lower.percentile);
  }

  return last.percentile;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function scoreLikertCtt(
  definition: LikertDefinition,
  answers: Record<string, unknown>,
): CttScore {
  const items: CttItemScore[] = [];
  let raw = 0;
  let min = 0;
  let max = 0;

  for (const item of definition.items) {
    const value = answers[item.id];
    if (!isLikertValue(item, value)) {
      throw new Error(`Missing or invalid answer for ${item.id}.`);
    }
    const keyed = keyedLikertScore(item, value);
    items.push({ id: item.id, keyed });
    raw += keyed;
    min += item.scale.min;
    max += item.scale.max;
  }

  const span = max - min;
  const pomp = span === 0 ? 0 : round1(((raw - min) / span) * 100);
  const scoring = definition.scoring;
  const percentile =
    scoring === undefined
      ? null
      : round1(interpolatePercentile(raw, scoring.norms.points) ?? 0);
  let band: CttBand | null = null;
  if (scoring) {
    const match =
      scoring.bands.find((entry) => raw <= entry.upTo) ??
      scoring.bands[scoring.bands.length - 1];
    if (match) {
      band = { id: match.id, label: match.label };
    }
  }

  return {
    model: SCORING_MODEL,
    raw,
    min,
    max,
    pomp,
    percentile: scoring ? percentile : null,
    band,
    normsKind: scoring ? scoring.norms.kind : null,
    items,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isCttScore(value: unknown): value is CttScore {
  if (!isRecord(value) || value.model !== SCORING_MODEL) {
    return false;
  }
  if (typeof value.raw !== "number" || typeof value.pomp !== "number") {
    return false;
  }
  return Array.isArray(value.items);
}
