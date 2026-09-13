import { type FigureSpec, figureSignature, parseFigureSpec } from "./figure";

export const SPEED_TRIAL_ENGINE = "speed-trial-v1" as const;
export const SPEED_FORM_ENGINE = "speed-form-v1" as const;
export const SPEED_CORRECTED_MODEL = "speed-corrected-v1" as const;

export const SPEED_CHOICE_SAME = "same" as const;
export const SPEED_CHOICE_DIFFERENT = "different" as const;
export const SPEED_CHOICES = [
  SPEED_CHOICE_SAME,
  SPEED_CHOICE_DIFFERENT,
] as const;

export const SPEED_MIN_DECISIONS = 8;
export const SPEED_MIN_SAMPLE_DECISIONS = 4;
export const SPEED_MIN_TRIAL_MS = 30_000;

export type SpeedChoiceId = (typeof SPEED_CHOICES)[number];

export type SpeedDecision = {
  id: string;
  left: FigureSpec;
  right: FigureSpec;
  /** The key. Random same/different with k=2 expects a signed score of 0. */
  same: boolean;
};

export type SpeedTrialContent = {
  engine: typeof SPEED_TRIAL_ENGINE;
  domain: "gs";
  prompt: string;
  /** Always 2 for this family: same or different. */
  k: 2;
  decisions: SpeedDecision[];
};

export type SpeedFormDefinition = {
  engine: typeof SPEED_FORM_ENGINE;
  domain: "gs";
  scoringModel: typeof SPEED_CORRECTED_MODEL;
  trialTimeLimitMs: number;
  sampleItemRevisionIds: string[];
  itemRevisionIds: string[];
};

export type ClientSpeedDecision = {
  id: string;
  left: FigureSpec;
  right: FigureSpec;
};

/** The key never leaves the server. */
export type ClientSpeedTrial = {
  engine: typeof SPEED_TRIAL_ENGINE;
  prompt: string;
  k: 2;
  choices: SpeedChoiceId[];
  decisions: ClientSpeedDecision[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseDecision(value: unknown, source: string): SpeedDecision {
  if (!isRecord(value)) {
    throw new Error(`${source} is not an object.`);
  }
  if (typeof value.id !== "string" || value.id.length === 0) {
    throw new Error(`${source} is missing id.`);
  }
  if (typeof value.same !== "boolean") {
    throw new Error(`${source} must say whether the pair is the same.`);
  }
  const left = parseFigureSpec(value.left, `${source} left`);
  const right = parseFigureSpec(value.right, `${source} right`);
  const leftSig = figureSignature(left);
  const rightSig = figureSignature(right);
  const leftLoose = figureSignature(left, { ignoreSize: true });
  const rightLoose = figureSignature(right, { ignoreSize: true });

  if (value.same && leftSig !== rightSig) {
    throw new Error(`${source} is marked same but the figures differ.`);
  }
  if (!value.same && leftSig === rightSig) {
    throw new Error(`${source} is marked different but the figures match.`);
  }
  if (!value.same && leftLoose === rightLoose) {
    throw new Error(`${source} differs only in size.`);
  }

  return { id: value.id, left, right, same: value.same };
}

export function parseSpeedTrialContent(
  value: unknown,
  source: string,
): SpeedTrialContent {
  if (!isRecord(value) || value.engine !== SPEED_TRIAL_ENGINE) {
    throw new Error(`${source} is not a ${SPEED_TRIAL_ENGINE} trial.`);
  }
  if (value.domain !== "gs") {
    throw new Error(`${source} must measure gs.`);
  }
  if (typeof value.prompt !== "string" || value.prompt.length === 0) {
    throw new Error(`${source} is missing a prompt.`);
  }
  if (value.k !== 2) {
    throw new Error(`${source} must use k=2 so chance performance is zero.`);
  }
  if (!Array.isArray(value.decisions) || value.decisions.length === 0) {
    throw new Error(`${source} needs decisions.`);
  }
  if (value.decisions.length < SPEED_MIN_SAMPLE_DECISIONS) {
    throw new Error(`${source} has too few decisions.`);
  }

  const decisions = value.decisions.map((entry, index) =>
    parseDecision(entry, `${source} decisions[${index}]`),
  );
  const ids = new Set<string>();
  for (const decision of decisions) {
    if (ids.has(decision.id)) {
      throw new Error(`${source} repeats decision ${decision.id}.`);
    }
    ids.add(decision.id);
  }

  return {
    engine: SPEED_TRIAL_ENGINE,
    domain: "gs",
    prompt: value.prompt,
    k: 2,
    decisions,
  };
}

export function parseSpeedFormDefinition(
  value: unknown,
  source: string,
): SpeedFormDefinition {
  if (!isRecord(value) || value.engine !== SPEED_FORM_ENGINE) {
    throw new Error(`${source} is not a ${SPEED_FORM_ENGINE} form.`);
  }
  if (value.domain !== "gs") {
    throw new Error(`${source} must measure gs.`);
  }
  if (value.scoringModel !== SPEED_CORRECTED_MODEL) {
    throw new Error(`${source} must use ${SPEED_CORRECTED_MODEL}.`);
  }
  if (
    typeof value.trialTimeLimitMs !== "number" ||
    !Number.isInteger(value.trialTimeLimitMs) ||
    value.trialTimeLimitMs < SPEED_MIN_TRIAL_MS
  ) {
    throw new Error(`${source} has an invalid trialTimeLimitMs.`);
  }

  const sampleItemRevisionIds = value.sampleItemRevisionIds ?? [];
  const itemRevisionIds = value.itemRevisionIds;
  if (!Array.isArray(sampleItemRevisionIds)) {
    throw new Error(`${source} sampleItemRevisionIds must be an array.`);
  }
  if (!Array.isArray(itemRevisionIds) || itemRevisionIds.length === 0) {
    throw new Error(`${source} needs at least one scored trial.`);
  }
  for (const id of [...sampleItemRevisionIds, ...itemRevisionIds]) {
    if (typeof id !== "string" || id.length === 0) {
      throw new Error(`${source} lists an empty revision id.`);
    }
  }

  return {
    engine: SPEED_FORM_ENGINE,
    domain: "gs",
    scoringModel: SPEED_CORRECTED_MODEL,
    trialTimeLimitMs: value.trialTimeLimitMs,
    sampleItemRevisionIds: sampleItemRevisionIds as string[],
    itemRevisionIds: itemRevisionIds as string[],
  };
}

export function toClientSpeedTrial(
  content: SpeedTrialContent,
): ClientSpeedTrial {
  return {
    engine: SPEED_TRIAL_ENGINE,
    prompt: content.prompt,
    k: content.k,
    choices: [...SPEED_CHOICES],
    decisions: content.decisions.map((decision) => ({
      id: decision.id,
      left: decision.left,
      right: decision.right,
    })),
  };
}

export function speedKey(decision: SpeedDecision): SpeedChoiceId {
  return decision.same ? SPEED_CHOICE_SAME : SPEED_CHOICE_DIFFERENT;
}

export function isSpeedTrialContent(
  value: unknown,
): value is SpeedTrialContent {
  return isRecord(value) && value.engine === SPEED_TRIAL_ENGINE;
}

export function isSpeedFormDefinition(
  value: unknown,
): value is SpeedFormDefinition {
  return isRecord(value) && value.engine === SPEED_FORM_ENGINE;
}
