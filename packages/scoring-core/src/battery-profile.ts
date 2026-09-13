import {
  BATTERY_PROFILE_MODEL,
  type BatteryDomain,
  type QualityObservation,
  SPAN_PARTIAL_MODEL,
  SPEED_CORRECTED_MODEL,
} from "@mindmetric/shared";
import type { AccuracyPowerScore } from "./accuracy-power";
import type { SpanPartialScore, SpanTrialRecord } from "./span-partial";
import type { SpeedCorrectedScore, SpeedTrialRecord } from "./speed-corrected";

/**
 * S0: raw domain totals only. Standardization and the composite have no
 * input yet, so those fields stay null rather than being hidden (ADR 0016).
 */
export const BATTERY_MATURITY_S0 = "S0" as const;

export type BatterySectionReport = {
  domain: BatteryDomain;
  position: number;
  scoringModel: string;
  status: "submitted" | "expired";
  normEligible: boolean;
  raw: number;
  max: number;
  attempted: number;
  accuracyOnAttempted: number | null;
  omitted: number;
  timedOut: number;
  notReached: number;
  observations: QualityObservation[];
};

export type BatteryProfileScore = {
  model: typeof BATTERY_PROFILE_MODEL;
  maturity: typeof BATTERY_MATURITY_S0;
  durationMs: number | null;
  composite: null;
  estimatedIq: null;
  percentile: null;
  interval: null;
  sections: BatterySectionReport[];
};

/** What the digest hashes: the answers, not the derived totals. */
export type PowerDigestRecord = {
  itemRevisionId: string;
  code: string;
  choiceId: string | null;
};

export function toBatterySectionReport(
  section: {
    domain: BatteryDomain;
    position: number;
    status: "submitted" | "expired";
    normEligible: boolean;
    observations: QualityObservation[];
  },
  score: AccuracyPowerScore,
): BatterySectionReport {
  return {
    domain: section.domain,
    position: section.position,
    scoringModel: score.model,
    status: section.status,
    normEligible: section.normEligible,
    raw: score.raw,
    max: score.max,
    attempted: score.attempted,
    accuracyOnAttempted: score.accuracyOnAttempted,
    omitted: score.omitted,
    timedOut: score.timedOut,
    notReached: score.notReached,
    observations: section.observations,
  };
}

/**
 * Aggregates already-scored sections. It does not invent a composite: that
 * gate needs reliability, SEM, and every core domain (ADR 0016).
 */
export function scoreBatteryProfile(input: {
  durationMs: number | null;
  sections: BatterySectionReport[];
}): BatteryProfileScore {
  const sections = [...input.sections].sort(
    (left, right) => left.position - right.position,
  );
  return {
    model: BATTERY_PROFILE_MODEL,
    maturity: BATTERY_MATURITY_S0,
    durationMs: input.durationMs,
    composite: null,
    estimatedIq: null,
    percentile: null,
    interval: null,
    sections,
  };
}

/** Stable serialization so the same answers always pin the same snapshot. */
export function toSpeedSectionReport(
  section: {
    domain: BatteryDomain;
    position: number;
    status: "submitted" | "expired";
    normEligible: boolean;
    observations: QualityObservation[];
  },
  score: SpeedCorrectedScore,
  authoredDecisionCount: number,
): BatterySectionReport {
  return {
    domain: section.domain,
    position: section.position,
    scoringModel: score.model,
    status: section.status,
    normEligible: section.normEligible,
    raw: score.trials.reduce((sum, trial) => sum + trial.displayRaw, 0),
    max: authoredDecisionCount,
    attempted: score.trials.reduce((sum, trial) => sum + trial.attempted, 0),
    accuracyOnAttempted: null,
    omitted: score.trials.reduce((sum, trial) => sum + trial.omitted, 0),
    timedOut: score.trials.reduce((sum, trial) => sum + trial.timedOut, 0),
    notReached: score.trials.reduce((sum, trial) => sum + trial.notReached, 0),
    observations: section.observations,
  };
}

export function toSpanSectionReport(
  section: {
    domain: BatteryDomain;
    position: number;
    status: "submitted" | "expired";
    normEligible: boolean;
    observations: QualityObservation[];
  },
  score: SpanPartialScore,
): BatterySectionReport {
  const combined = score.procedures.length > 1;
  return {
    domain: section.domain,
    position: section.position,
    scoringModel: score.model,
    status: section.status,
    normEligible: section.normEligible,
    raw: combined
      ? Math.round(score.combinedProportion * 1000) / 10
      : score.raw,
    max: combined ? 100 : score.max,
    attempted: score.attempted,
    accuracyOnAttempted: null,
    omitted: score.omitted,
    timedOut: score.timedOut,
    notReached: score.notReached,
    observations: section.observations,
  };
}

export function spanSectionInputCanon(
  procedures: Array<{ id: string; trials: SpanTrialRecord[] }>,
) {
  const rows = [...procedures]
    .map((procedure) => [
      procedure.id,
      ...[...procedure.trials]
        .map((trial) => [
          trial.itemRevisionId,
          trial.code,
          (trial.recalled ?? []).join(","),
        ])
        .sort((left, right) =>
          String(left[0] ?? "").localeCompare(String(right[0] ?? "")),
        ),
    ])
    .sort((left, right) =>
      String(left[0] ?? "").localeCompare(String(right[0] ?? "")),
    );
  return JSON.stringify({ model: SPAN_PARTIAL_MODEL, procedures: rows });
}

export function speedSectionInputCanon(records: SpeedTrialRecord[]) {
  const trials = [...records]
    .map((record) => [
      record.itemRevisionId,
      ...record.decisions.map((row) => [
        row.decisionId,
        row.code,
        row.choiceId ?? "",
      ]),
    ])
    .sort((left, right) =>
      String(left[0] ?? "").localeCompare(String(right[0] ?? "")),
    );
  return JSON.stringify({ model: SPEED_CORRECTED_MODEL, trials });
}

export function powerSectionInputCanon(records: PowerDigestRecord[]) {
  const items = [...records]
    .map((record) => [
      record.itemRevisionId,
      record.code,
      record.choiceId ?? "",
    ])
    .sort((left, right) => (left[0] ?? "").localeCompare(right[0] ?? ""));
  return JSON.stringify({ model: "accuracy-power-v1", items });
}

export function batteryProfileInputCanon(sectionDigests: string[]) {
  return JSON.stringify({
    model: BATTERY_PROFILE_MODEL,
    sections: [...sectionDigests].sort(),
  });
}
