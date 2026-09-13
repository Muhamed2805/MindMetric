import type { ItemOutcome, SpeedTrialContent } from "@mindmetric/shared";
import { SPEED_CORRECTED_MODEL, speedKey } from "@mindmetric/shared";

export type SpeedDecisionRecord = {
  decisionId: string;
  code: ItemOutcome;
  choiceId: string | null;
};

export type SpeedTrialRecord = {
  itemRevisionId: string;
  content: SpeedTrialContent;
  decisions: SpeedDecisionRecord[];
};

export type SpeedTrialScore = {
  itemRevisionId: string;
  k: number;
  correct: number;
  incorrect: number;
  omitted: number;
  timedOut: number;
  notReached: number;
  invalid: number;
  attempted: number;
  /** C − E/(k−1). Chance responding expects 0. */
  signedRaw: number;
  /** What the report shows: a negative trial displays as zero (ADR 0016). */
  displayRaw: number;
};

/**
 * Per-trial speed scores. There is no Gs index here: that waits for a
 * sample-based standardization (ADR 0016).
 */
export type SpeedCorrectedScore = {
  model: typeof SPEED_CORRECTED_MODEL;
  domain: "gs";
  trials: SpeedTrialScore[];
};

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function scoreSpeedTrial(record: SpeedTrialRecord): SpeedTrialScore {
  const byId = new Map(
    record.content.decisions.map((decision) => [decision.id, decision]),
  );
  const seen = new Set<string>();
  let correct = 0;
  let incorrect = 0;
  let omitted = 0;
  let timedOut = 0;
  let notReached = 0;
  let invalid = 0;

  for (const row of record.decisions) {
    if (seen.has(row.decisionId)) {
      throw new Error(
        `Trial ${record.itemRevisionId} repeats decision ${row.decisionId}.`,
      );
    }
    seen.add(row.decisionId);
    const decision = byId.get(row.decisionId);
    if (!decision) {
      throw new Error(
        `Trial ${record.itemRevisionId} has unknown decision ${row.decisionId}.`,
      );
    }

    if (row.code === "invalid") {
      invalid += 1;
      continue;
    }
    if (row.code === "not_reached") {
      notReached += 1;
      continue;
    }
    if (row.code === "omitted") {
      omitted += 1;
      continue;
    }
    if (row.code === "timed_out" || row.code === "post_deadline") {
      timedOut += 1;
      continue;
    }
    if (row.choiceId === speedKey(decision)) {
      correct += 1;
    } else {
      incorrect += 1;
    }
  }

  const k = record.content.k;
  const signedRaw = round3(correct - incorrect / (k - 1));
  return {
    itemRevisionId: record.itemRevisionId,
    k,
    correct,
    incorrect,
    omitted,
    timedOut,
    notReached,
    invalid,
    attempted: correct + incorrect,
    signedRaw,
    displayRaw: Math.max(0, signedRaw),
  };
}

export function scoreSpeedCorrected(
  records: SpeedTrialRecord[],
): SpeedCorrectedScore {
  return {
    model: SPEED_CORRECTED_MODEL,
    domain: "gs",
    trials: records.map(scoreSpeedTrial),
  };
}
