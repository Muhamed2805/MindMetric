import {
  type ItemOutcome,
  SPAN_PARTIAL_MODEL,
  type SpanRecall,
  spanRecallTarget,
} from "@mindmetric/shared";

export type SpanTrialRecord = {
  itemRevisionId: string;
  length: number;
  recall: SpanRecall;
  sequence: string[];
  recalled: string[] | null;
  code: ItemOutcome;
};

export type SpanTrialScore = {
  itemRevisionId: string;
  length: number;
  raw: number;
  max: number;
  fullyCorrect: boolean;
  discontinued: boolean;
  invalid: boolean;
  omitted: boolean;
  timedOut: boolean;
  notReached: boolean;
};

export type SpanProcedureScore = {
  id: string;
  raw: number;
  max: number;
  attempted: number;
  omitted: number;
  timedOut: number;
  notReached: number;
  invalid: number;
  absoluteSpan: number;
  sequencesFullyCorrect: number;
  trials: SpanTrialScore[];
};

/**
 * Strict serial-position partial credit on a fixed ladder (ADR 0016).
 * Two procedures, when both present, combine as an equal-weight proportion
 * of their adjusted maxima.
 */
export type SpanPartialScore = {
  model: typeof SPAN_PARTIAL_MODEL;
  domain: "gwm";
  raw: number;
  max: number;
  combinedProportion: number;
  attempted: number;
  omitted: number;
  timedOut: number;
  notReached: number;
  invalid: number;
  procedures: SpanProcedureScore[];
};

function positionCredits(target: string[], recalled: string[] | null) {
  if (recalled === null) {
    return 0;
  }
  let credits = 0;
  for (let index = 0; index < target.length; index += 1) {
    if (recalled[index] === target[index]) {
      credits += 1;
    }
  }
  return credits;
}

function scoreProcedure(
  id: string,
  records: SpanTrialRecord[],
): SpanProcedureScore {
  const trials: SpanTrialScore[] = [];
  let consecutiveZero = 0;
  let discontinued = false;
  let raw = 0;
  let max = 0;
  let attempted = 0;
  let omitted = 0;
  let timedOut = 0;
  let notReached = 0;
  let invalid = 0;
  let absoluteSpan = 0;
  let sequencesFullyCorrect = 0;

  for (const record of records) {
    const target = spanRecallTarget(record.sequence, record.recall);
    if (target.length !== record.length) {
      throw new Error(
        `Trial ${record.itemRevisionId} sequence length does not match.`,
      );
    }

    if (record.code === "invalid") {
      invalid += 1;
      trials.push({
        itemRevisionId: record.itemRevisionId,
        length: record.length,
        raw: 0,
        max: 0,
        fullyCorrect: false,
        discontinued: false,
        invalid: true,
        omitted: false,
        timedOut: false,
        notReached: false,
      });
      continue;
    }

    const forcedZero = discontinued;
    const credits = forcedZero ? 0 : positionCredits(target, record.recalled);
    const isOmit = record.code === "omitted";
    const isTimeout = record.code === "timed_out";
    const isNotReached = record.code === "not_reached" || forcedZero;
    const fullyCorrect = !forcedZero && credits === record.length;

    max += record.length;
    raw += credits;
    if (isOmit) {
      omitted += 1;
      attempted += 1;
    } else if (isTimeout) {
      timedOut += 1;
      attempted += 1;
    } else if (isNotReached) {
      notReached += 1;
    } else {
      attempted += 1;
    }

    if (fullyCorrect) {
      sequencesFullyCorrect += 1;
      if (record.length > absoluteSpan) {
        absoluteSpan = record.length;
      }
    }

    if (!forcedZero && credits === 0) {
      consecutiveZero += 1;
      if (consecutiveZero >= 2) {
        discontinued = true;
      }
    } else if (!forcedZero) {
      consecutiveZero = 0;
    }

    trials.push({
      itemRevisionId: record.itemRevisionId,
      length: record.length,
      raw: credits,
      max: record.length,
      fullyCorrect,
      discontinued: forcedZero,
      invalid: false,
      omitted: isOmit,
      timedOut: isTimeout,
      notReached: isNotReached,
    });
  }

  return {
    id,
    raw,
    max,
    attempted,
    omitted,
    timedOut,
    notReached,
    invalid,
    absoluteSpan,
    sequencesFullyCorrect,
    trials,
  };
}

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function scoreSpanPartial(
  procedures: Array<{ id: string; trials: SpanTrialRecord[] }>,
): SpanPartialScore {
  if (procedures.length === 0) {
    throw new Error("span-partial-v1 needs at least one procedure.");
  }

  const scored = procedures.map((procedure) =>
    scoreProcedure(procedure.id, procedure.trials),
  );
  const combinedProportion = round3(
    scored.reduce((sum, procedure) => {
      if (procedure.max === 0) {
        return sum;
      }
      return sum + procedure.raw / procedure.max;
    }, 0) / scored.length,
  );

  return {
    model: SPAN_PARTIAL_MODEL,
    domain: "gwm",
    raw: scored.reduce((sum, procedure) => sum + procedure.raw, 0),
    max: scored.reduce((sum, procedure) => sum + procedure.max, 0),
    combinedProportion,
    attempted: scored.reduce((sum, procedure) => sum + procedure.attempted, 0),
    omitted: scored.reduce((sum, procedure) => sum + procedure.omitted, 0),
    timedOut: scored.reduce((sum, procedure) => sum + procedure.timedOut, 0),
    notReached: scored.reduce(
      (sum, procedure) => sum + procedure.notReached,
      0,
    ),
    invalid: scored.reduce((sum, procedure) => sum + procedure.invalid, 0),
    procedures: scored,
  };
}
