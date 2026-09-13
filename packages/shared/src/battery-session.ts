import type { ResponseCode } from "./battery";
import type { PowerMcqItemContent } from "./power-mcq";

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
