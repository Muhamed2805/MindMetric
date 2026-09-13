export const MCQ_TIMED_ENGINE = "mcq-timed-v1" as const;
export const SUM_CORRECT_MODEL = "sum-correct-v1" as const;

export type McqChoice = {
  id: string;
  label: string;
};

export type McqTimedItem = {
  id: string;
  type: "mcq";
  prompt: string;
  choices: McqChoice[];
  correctChoiceId: string;
  timeLimitMs: number;
};

export type McqTimedScoring = {
  model: typeof SUM_CORRECT_MODEL;
  bands: { upTo: number; id: string; label: string }[];
  norms: {
    kind: "development";
    points: { score: number; percentile: number }[];
  };
};

export type McqTimedDefinition = {
  engine: typeof MCQ_TIMED_ENGINE;
  items: McqTimedItem[];
  scoring?: McqTimedScoring;
};

export type ClientMcqItem = Omit<McqTimedItem, "correctChoiceId">;

export type McqAnswerValue = {
  choiceId: string | null;
  elapsedMs: number;
  timedOut: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isMcqTimedDefinition(
  value: unknown,
): value is McqTimedDefinition {
  if (!isRecord(value) || value.engine !== MCQ_TIMED_ENGINE) {
    return false;
  }
  if (!Array.isArray(value.items) || value.items.length === 0) {
    return false;
  }
  if (!value.items.every(isMcqTimedItem)) {
    return false;
  }
  const ids = value.items.map((item) =>
    isRecord(item) && typeof item.id === "string" ? item.id : "",
  );
  if (new Set(ids).size !== ids.length) {
    return false;
  }
  if (value.scoring === undefined) {
    return true;
  }
  return isMcqTimedScoring(value.scoring);
}

function isMcqTimedItem(value: unknown): value is McqTimedItem {
  if (!isRecord(value) || value.type !== "mcq") {
    return false;
  }
  if (typeof value.id !== "string" || typeof value.prompt !== "string") {
    return false;
  }
  if (value.prompt.length === 0) {
    return false;
  }
  if (
    typeof value.correctChoiceId !== "string" ||
    typeof value.timeLimitMs !== "number" ||
    !Number.isInteger(value.timeLimitMs) ||
    value.timeLimitMs < 1000
  ) {
    return false;
  }
  if (!Array.isArray(value.choices) || value.choices.length < 2) {
    return false;
  }
  const choiceIds = new Set<string>();
  for (const choice of value.choices) {
    if (!isRecord(choice)) {
      return false;
    }
    if (typeof choice.id !== "string" || typeof choice.label !== "string") {
      return false;
    }
    if (choice.label.length === 0 || choiceIds.has(choice.id)) {
      return false;
    }
    choiceIds.add(choice.id);
  }
  return choiceIds.has(value.correctChoiceId);
}

function isMcqTimedScoring(value: unknown): value is McqTimedScoring {
  if (!isRecord(value) || value.model !== SUM_CORRECT_MODEL) {
    return false;
  }
  if (!Array.isArray(value.bands) || value.bands.length === 0) {
    return false;
  }
  let previous = Number.NEGATIVE_INFINITY;
  const bandsOk = value.bands.every((band) => {
    if (!isRecord(band)) {
      return false;
    }
    if (typeof band.upTo !== "number" || band.upTo <= previous) {
      return false;
    }
    previous = band.upTo;
    return typeof band.id === "string" && typeof band.label === "string";
  });
  if (
    !bandsOk ||
    !isRecord(value.norms) ||
    value.norms.kind !== "development" ||
    !Array.isArray(value.norms.points) ||
    value.norms.points.length === 0
  ) {
    return false;
  }
  let previousScore = Number.NEGATIVE_INFINITY;
  let previousPercentile = Number.NEGATIVE_INFINITY;
  return value.norms.points.every((point) => {
    if (!isRecord(point)) {
      return false;
    }
    if (
      typeof point.score !== "number" ||
      typeof point.percentile !== "number"
    ) {
      return false;
    }
    if (point.score <= previousScore || point.percentile < previousPercentile) {
      return false;
    }
    if (point.percentile < 0 || point.percentile > 100) {
      return false;
    }
    previousScore = point.score;
    previousPercentile = point.percentile;
    return true;
  });
}

export function toClientMcqItem(item: McqTimedItem): ClientMcqItem {
  return {
    id: item.id,
    type: item.type,
    prompt: item.prompt,
    choices: item.choices,
    timeLimitMs: item.timeLimitMs,
  };
}

export function parseMcqAnswer(value: unknown): McqAnswerValue | null {
  if (!isRecord(value)) {
    return null;
  }
  if (
    typeof value.elapsedMs !== "number" ||
    !Number.isFinite(value.elapsedMs) ||
    value.elapsedMs < 0
  ) {
    return null;
  }
  const timedOut = value.timedOut === true;
  if (value.choiceId === null || value.choiceId === undefined) {
    if (!timedOut) {
      return null;
    }
    return { choiceId: null, elapsedMs: value.elapsedMs, timedOut: true };
  }
  if (typeof value.choiceId !== "string" || value.choiceId.length === 0) {
    return null;
  }
  return { choiceId: value.choiceId, elapsedMs: value.elapsedMs, timedOut };
}

export function normalizeMcqAnswer(
  item: Pick<McqTimedItem, "choices" | "timeLimitMs">,
  value: unknown,
  graceMs = 750,
): McqAnswerValue | null {
  const parsed = parseMcqAnswer(value);
  if (!parsed) {
    return null;
  }
  const overTime = parsed.elapsedMs > item.timeLimitMs + graceMs;
  const timedOut = parsed.timedOut || overTime;
  if (timedOut) {
    return {
      choiceId: parsed.choiceId,
      elapsedMs: parsed.elapsedMs,
      timedOut: true,
    };
  }
  if (
    !parsed.choiceId ||
    !item.choices.some((choice) => choice.id === parsed.choiceId)
  ) {
    return null;
  }
  return parsed;
}
