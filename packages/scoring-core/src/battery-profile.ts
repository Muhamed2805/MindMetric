import { BATTERY_PROFILE_MODEL, type BatteryDomain } from "@mindmetric/shared";
import type { AccuracyPowerScore } from "./accuracy-power";

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
