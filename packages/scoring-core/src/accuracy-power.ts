import type {
  DifficultyTier,
  ItemOutcome,
  PowerDomain,
  PowerMcqItemContent,
} from "@mindmetric/shared";
import { ACCURACY_POWER_MODEL, DIFFICULTY_TIERS } from "@mindmetric/shared";

/**
 * One administered scored item. `not_reached` items were never shown; they
 * still belong here so the section knows its own denominator.
 */
export type PowerItemRecord = {
  itemRevisionId: string;
  content: PowerMcqItemContent;
  code: ItemOutcome;
  choiceId: string | null;
  responseTimeMs: number | null;
};

export type PowerItemScore = {
  itemRevisionId: string;
  difficulty: DifficultyTier;
  anchor: boolean;
  outcome:
    | "correct"
    | "incorrect"
    | "omitted"
    | "timed_out"
    | "not_reached"
    | "post_deadline"
    | "invalid";
  responseTimeMs: number | null;
};

export type PowerDifficultyBreakdown = {
  tier: DifficultyTier;
  inForm: number;
  administered: number;
  correct: number;
};

/**
 * Raw performance only. There is no percentile, band, or composite here: those
 * need a norms version, which does not exist at S0 (ADR 0016).
 */
export type AccuracyPowerScore = {
  model: typeof ACCURACY_POWER_MODEL;
  domain: PowerDomain;
  raw: number;
  max: number;
  attempted: number;
  correct: number;
  incorrect: number;
  omitted: number;
  timedOut: number;
  notReached: number;
  postDeadline: number;
  invalid: number;
  accuracyOnAttempted: number | null;
  medianResponseTimeMs: number | null;
  difficulty: PowerDifficultyBreakdown[];
  anchorsAdministered: number;
  anchorsFailed: number;
  items: PowerItemScore[];
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function median(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? null;
  }
  const low = sorted[middle - 1];
  const high = sorted[middle];
  if (low === undefined || high === undefined) {
    return null;
  }
  return round1((low + high) / 2);
}

function itemOutcome(record: PowerItemRecord): PowerItemScore["outcome"] {
  if (record.code === "answered") {
    return record.choiceId === record.content.correctChoiceId
      ? "correct"
      : "incorrect";
  }
  if (record.code === "omitted") {
    return "omitted";
  }
  if (record.code === "timed_out") {
    return "timed_out";
  }
  if (record.code === "not_reached") {
    return "not_reached";
  }
  if (record.code === "post_deadline") {
    return "post_deadline";
  }
  return "invalid";
}

/**
 * Number correct, unweighted, with no guessing correction. `omitted` and
 * `timed_out` count as attempted; `not_reached` and `post_deadline` do not;
 * `invalid` leaves the denominator entirely (ADR 0016).
 */
export function scoreAccuracyPower(
  domain: PowerDomain,
  records: PowerItemRecord[],
): AccuracyPowerScore {
  const items: PowerItemScore[] = [];
  const counts = {
    correct: 0,
    incorrect: 0,
    omitted: 0,
    timed_out: 0,
    not_reached: 0,
    post_deadline: 0,
    invalid: 0,
  };
  const difficulty = new Map<DifficultyTier, PowerDifficultyBreakdown>(
    DIFFICULTY_TIERS.map((tier) => [
      tier,
      { tier, inForm: 0, administered: 0, correct: 0 },
    ]),
  );
  const answeredTimes: number[] = [];
  let anchorsAdministered = 0;
  let anchorsFailed = 0;

  for (const record of records) {
    if (record.content.domain !== domain) {
      throw new Error(
        `Item ${record.itemRevisionId} measures ${record.content.domain}, not ${domain}.`,
      );
    }

    const outcome = itemOutcome(record);
    counts[outcome] += 1;

    const tier = difficulty.get(record.content.difficulty);
    const administered =
      outcome !== "not_reached" &&
      outcome !== "post_deadline" &&
      outcome !== "invalid";

    if (tier && outcome !== "invalid") {
      tier.inForm += 1;
      if (administered) {
        tier.administered += 1;
        if (outcome === "correct") {
          tier.correct += 1;
        }
      }
    }

    if (record.content.anchor && administered) {
      anchorsAdministered += 1;
      if (outcome !== "correct") {
        anchorsFailed += 1;
      }
    }

    if (outcome === "correct" || outcome === "incorrect") {
      if (record.responseTimeMs !== null) {
        answeredTimes.push(record.responseTimeMs);
      }
    }

    items.push({
      itemRevisionId: record.itemRevisionId,
      difficulty: record.content.difficulty,
      anchor: record.content.anchor,
      outcome,
      responseTimeMs: record.responseTimeMs,
    });
  }

  const raw = counts.correct;
  const max = records.length - counts.invalid;
  const attempted =
    counts.correct + counts.incorrect + counts.omitted + counts.timed_out;

  return {
    model: ACCURACY_POWER_MODEL,
    domain,
    raw,
    max,
    attempted,
    correct: counts.correct,
    incorrect: counts.incorrect,
    omitted: counts.omitted,
    timedOut: counts.timed_out,
    notReached: counts.not_reached,
    postDeadline: counts.post_deadline,
    invalid: counts.invalid,
    accuracyOnAttempted:
      attempted === 0 ? null : round1((raw / attempted) * 100),
    medianResponseTimeMs: median(answeredTimes),
    difficulty: DIFFICULTY_TIERS.map(
      (tier) =>
        difficulty.get(tier) ?? {
          tier,
          inForm: 0,
          administered: 0,
          correct: 0,
        },
    ),
    anchorsAdministered,
    anchorsFailed,
    items,
  };
}
