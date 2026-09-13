import type { McqTimedDefinition } from "@mindmetric/shared";
import { normalizeMcqAnswer, SUM_CORRECT_MODEL } from "@mindmetric/shared";
import type { CttScore } from "./ctt";
import { interpolatePercentile, isCttScore } from "./ctt";

export type SumCorrectItemScore = {
  id: string;
  correct: boolean;
  timedOut: boolean;
  elapsedMs: number;
};

export type SumCorrectScore = {
  model: typeof SUM_CORRECT_MODEL;
  raw: number;
  min: number;
  max: number;
  pomp: number;
  percentile: number | null;
  band: { id: string; label: string } | null;
  normsKind: "development" | null;
  items: SumCorrectItemScore[];
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function scoreMcqTimed(
  definition: McqTimedDefinition,
  answers: Record<string, unknown>,
): SumCorrectScore {
  const items: SumCorrectItemScore[] = [];
  let raw = 0;

  for (const item of definition.items) {
    const normalized = normalizeMcqAnswer(item, answers[item.id]);
    if (!normalized) {
      throw new Error(`Missing or invalid answer for ${item.id}.`);
    }
    const correct =
      !normalized.timedOut && normalized.choiceId === item.correctChoiceId;
    if (correct) {
      raw += 1;
    }
    items.push({
      id: item.id,
      correct,
      timedOut: normalized.timedOut,
      elapsedMs: normalized.elapsedMs,
    });
  }

  const max = definition.items.length;
  const pomp = max === 0 ? 0 : round1((raw / max) * 100);
  const scoring = definition.scoring;
  const percentile =
    scoring === undefined
      ? null
      : round1(interpolatePercentile(raw, scoring.norms.points) ?? 0);
  let band: SumCorrectScore["band"] = null;
  if (scoring) {
    const match =
      scoring.bands.find((entry) => raw <= entry.upTo) ??
      scoring.bands[scoring.bands.length - 1];
    if (match) {
      band = { id: match.id, label: match.label };
    }
  }

  return {
    model: SUM_CORRECT_MODEL,
    raw,
    min: 0,
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

export function isSumCorrectScore(value: unknown): value is SumCorrectScore {
  if (!isRecord(value) || value.model !== SUM_CORRECT_MODEL) {
    return false;
  }
  if (typeof value.raw !== "number" || typeof value.max !== "number") {
    return false;
  }
  return Array.isArray(value.items);
}

export function isStoredScore(
  value: unknown,
): value is CttScore | SumCorrectScore {
  return isSumCorrectScore(value) || isCttScore(value);
}
