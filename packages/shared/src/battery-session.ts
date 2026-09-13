import type { ItemOutcome, ResponseCode } from "./battery";
import type { PowerMcqItemContent } from "./power-mcq";
import { SPEED_CHOICES } from "./speed";

/**
 * Append-only evidence. Visibility, focus and resume are logged, never used as
 * gates: fullscreen is recommended and not enforced (ADR 0017).
 */
export const CLIENT_QUALITY_EVENT_KINDS = [
  "visibility_hidden",
  "visibility_visible",
  "focus_lost",
  "focus_regained",
  "fullscreen_entered",
  "fullscreen_exited",
  "viewport_resized",
  "session_resumed",
] as const;

/** Kinds the server writes itself, which a client may not claim. */
export const SERVER_QUALITY_EVENT_KINDS = [
  "section_expired",
  "item_ceiling_reached",
] as const;

export const QUALITY_EVENT_KINDS = [
  ...CLIENT_QUALITY_EVENT_KINDS,
  ...SERVER_QUALITY_EVENT_KINDS,
] as const;

export type ClientQualityEventKind =
  (typeof CLIENT_QUALITY_EVENT_KINDS)[number];
export type QualityEventKind = (typeof QUALITY_EVENT_KINDS)[number];

export function isClientQualityEventKind(
  value: unknown,
): value is ClientQualityEventKind {
  return (CLIENT_QUALITY_EVENT_KINDS as readonly unknown[]).includes(value);
}

/**
 * Allowance for network transit on a submission, not for thinking time. The
 * section clock is an absolute server deadline (ADR 0014), so without it an
 * answer chosen in time can still arrive late and be discarded.
 */
export const SUBMISSION_GRACE_MS = 2_000;

/**
 * What the examinee actually saw. A stored choice id is meaningless without
 * the option order, and positional-bias detection reads presented positions
 * rather than authored ones (ADR 0017).
 */
export type ItemPresentation = {
  choiceOrder: string[];
};

export type ResponseClassificationInput = {
  choiceId: string | null;
  /** Server time the item was served. Null when nothing was presented. */
  shownAt: Date | null;
  /** Absolute end of the section clock. */
  deadlineAt: Date;
  itemCeilingMs: number;
  /** Server time the submission arrived. */
  receivedAt: Date;
};

export type ResponseClassification = {
  code: ResponseCode;
  /** Null whenever the submission cannot be timed. */
  responseTimeMs: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseItemPresentation(
  value: unknown,
  source: string,
): ItemPresentation {
  if (!isRecord(value)) {
    throw new Error(`${source} is not an object.`);
  }
  if (!Array.isArray(value.choiceOrder) || value.choiceOrder.length === 0) {
    throw new Error(`${source} is missing choiceOrder.`);
  }
  const seen = new Set<string>();
  for (const entry of value.choiceOrder) {
    if (typeof entry !== "string" || entry.length === 0) {
      throw new Error(`${source} choiceOrder holds a non-id entry.`);
    }
    if (seen.has(entry)) {
      throw new Error(`${source} choiceOrder repeats ${entry}.`);
    }
    seen.add(entry);
  }
  return { choiceOrder: [...value.choiceOrder] };
}

/** Fisher-Yates over a caller-supplied source of randomness. */
export function shuffleForPresentation<T>(
  values: readonly T[],
  random: () => number,
): T[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = shuffled[index] as T;
    shuffled[index] = shuffled[swap] as T;
    shuffled[swap] = current;
  }
  return shuffled;
}

export function buildItemPresentation(
  content: PowerMcqItemContent,
  random: () => number,
): ItemPresentation {
  return {
    choiceOrder: shuffleForPresentation(
      content.choices.map((choice) => choice.id),
      random,
    ),
  };
}

/** Same/different stay in a fixed order so motor mapping is stable. */
export function buildSpeedPresentation(): ItemPresentation {
  return { choiceOrder: [...SPEED_CHOICES] };
}

export type SpeedDecisionSubmission = {
  decisionId: string;
  choiceId: string | null;
};

export type SpeedTrialClassification = {
  trialCode: ResponseCode;
  responseTimeMs: number | null;
  decisions: Array<{
    decisionId: string;
    code: ItemOutcome;
    choiceId: string | null;
  }>;
};

export function parseSpeedDecisionSubmissions(
  value: unknown,
  source: string,
): SpeedDecisionSubmission[] {
  if (!Array.isArray(value)) {
    throw new Error(`${source} must be an array.`);
  }
  const seen = new Set<string>();
  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`${source}[${index}] is not an object.`);
    }
    if (typeof entry.decisionId !== "string" || entry.decisionId.length === 0) {
      throw new Error(`${source}[${index}] is missing decisionId.`);
    }
    if (seen.has(entry.decisionId)) {
      throw new Error(`${source} repeats ${entry.decisionId}.`);
    }
    seen.add(entry.decisionId);
    const choiceId =
      typeof entry.choiceId === "string" && entry.choiceId.length > 0
        ? entry.choiceId
        : null;
    return { decisionId: entry.decisionId, choiceId };
  });
}

/**
 * One trial is one submission. The server clock decides whether the batch
 * arrived in time; listed pairs are answered or omitted, unlisted pairs were
 * never reached (ADR 0014, ADR 0016).
 */
export function classifySpeedTrial(input: {
  shownAt: Date | null;
  receivedAt: Date;
  trialTimeLimitMs: number;
  sectionDeadlineAt: Date | null;
  authoredIds: readonly string[];
  submissions: readonly SpeedDecisionSubmission[];
  allowedChoiceIds: readonly string[];
  isSample: boolean;
}): SpeedTrialClassification {
  const {
    shownAt,
    receivedAt,
    trialTimeLimitMs,
    sectionDeadlineAt,
    authoredIds,
    submissions,
    allowedChoiceIds,
    isSample,
  } = input;
  const byId = new Map(submissions.map((entry) => [entry.decisionId, entry]));

  if (!shownAt) {
    return {
      trialCode: "invalid",
      responseTimeMs: null,
      decisions: authoredIds.map((decisionId) => ({
        decisionId,
        code: "invalid",
        choiceId: null,
      })),
    };
  }

  const elapsedMs = receivedAt.getTime() - shownAt.getTime();
  if (elapsedMs < 0) {
    return {
      trialCode: "invalid",
      responseTimeMs: null,
      decisions: authoredIds.map((decisionId) => ({
        decisionId,
        code: "invalid",
        choiceId: null,
      })),
    };
  }

  let lateCode: ResponseCode | null = null;
  if (
    !isSample &&
    sectionDeadlineAt &&
    receivedAt.getTime() > sectionDeadlineAt.getTime() + SUBMISSION_GRACE_MS
  ) {
    lateCode = "post_deadline";
  } else if (!isSample && elapsedMs > trialTimeLimitMs + SUBMISSION_GRACE_MS) {
    lateCode = "timed_out";
  }

  const decisions: SpeedTrialClassification["decisions"] = authoredIds.map(
    (decisionId) => {
      if (lateCode) {
        return { decisionId, code: lateCode, choiceId: null };
      }
      const submitted = byId.get(decisionId);
      if (!submitted) {
        return {
          decisionId,
          code: isSample ? "omitted" : "not_reached",
          choiceId: null,
        };
      }
      if (
        submitted.choiceId !== null &&
        !allowedChoiceIds.includes(submitted.choiceId)
      ) {
        return { decisionId, code: "invalid", choiceId: null };
      }
      return {
        decisionId,
        code: submitted.choiceId === null ? "omitted" : "answered",
        choiceId: submitted.choiceId,
      };
    },
  );

  const trialCode = lateCode
    ? lateCode
    : decisions.some((row) => row.code === "answered")
      ? "answered"
      : decisions.some((row) => row.code === "invalid")
        ? "invalid"
        : "omitted";

  return { trialCode, responseTimeMs: elapsedMs, decisions };
}

/**
 * Server-authoritative outcome of a submission. Correctness is deliberately
 * not decided here: it is derived at scoring time from the choice and the key,
 * so a key correction can be re-scored (ADR 0016).
 */
export function classifyResponse(
  input: ResponseClassificationInput,
): ResponseClassification {
  const { choiceId, shownAt, deadlineAt, itemCeilingMs, receivedAt } = input;

  if (!shownAt) {
    return { code: "invalid", responseTimeMs: null };
  }

  const elapsedMs = receivedAt.getTime() - shownAt.getTime();
  if (elapsedMs < 0) {
    // Impossible timing is a hard technical fault, not a slow answer.
    return { code: "invalid", responseTimeMs: null };
  }

  if (receivedAt.getTime() > deadlineAt.getTime() + SUBMISSION_GRACE_MS) {
    return { code: "post_deadline", responseTimeMs: elapsedMs };
  }

  if (elapsedMs > itemCeilingMs + SUBMISSION_GRACE_MS) {
    return { code: "timed_out", responseTimeMs: elapsedMs };
  }

  return {
    code: choiceId === null ? "omitted" : "answered",
    responseTimeMs: elapsedMs,
  };
}
