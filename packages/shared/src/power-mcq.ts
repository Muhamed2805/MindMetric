import { isPowerDomain, type PowerDomain } from "./battery";
import { type FigureSpec, parseFigureSpec } from "./figure";

export const POWER_MCQ_ENGINE = "power-mcq-v1" as const;
export const POWER_FORM_ENGINE = "power-form-v1" as const;
export const ACCURACY_POWER_MODEL = "accuracy-power-v1" as const;

export const DIFFICULTY_TIERS = ["easy", "moderate", "hard"] as const;

export const POWER_MIN_CHOICES = 2;
export const POWER_MAX_CHOICES = 8;
export const POWER_MIN_SECTION_MS = 60_000;
export const POWER_MIN_CEILING_MS = 15_000;

export type DifficultyTier = (typeof DIFFICULTY_TIERS)[number];

export type PowerStimulus =
  | { type: "figure"; figure: FigureSpec }
  | { type: "text"; text: string };

export type PowerChoice = {
  id: string;
  content: PowerStimulus;
};

export type PowerMcqItemContent = {
  engine: typeof POWER_MCQ_ENGINE;
  domain: PowerDomain;
  prompt: string | null;
  stimulus: PowerStimulus;
  choices: PowerChoice[];
  correctChoiceId: string;
  difficulty: DifficultyTier;
  /** Ultra-easy validity anchor. Scored, but never interpreted as ability. */
  anchor: boolean;
};

/**
 * A form is an ordered selection of published item revisions plus its timing.
 * Item content lives in the bank, so one item can appear in several forms and
 * stay a single calibration target (ADR 0015).
 */
export type PowerFormDefinition = {
  engine: typeof POWER_FORM_ENGINE;
  domain: PowerDomain;
  scoringModel: typeof ACCURACY_POWER_MODEL;
  sectionTimeLimitMs: number;
  itemCeilingMs: number;
  sampleItemRevisionIds: string[];
  itemRevisionIds: string[];
};

export type ClientPowerChoice = PowerChoice;

/** The key never leaves the server. */
export type ClientPowerItem = {
  prompt: string | null;
  stimulus: PowerStimulus;
  choices: ClientPowerChoice[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseStimulus(value: unknown, source: string): PowerStimulus {
  if (!isRecord(value)) {
    throw new Error(`${source} is not an object.`);
  }
  if (value.type === "text") {
    if (typeof value.text !== "string" || value.text.length === 0) {
      throw new Error(`${source} has empty text.`);
    }
    return { type: "text", text: value.text };
  }
  if (value.type !== "figure") {
    throw new Error(`${source} has an unknown stimulus type.`);
  }
  return { type: "figure", figure: parseFigureSpec(value.figure, source) };
}

export function parsePowerMcqItemContent(
  value: unknown,
  source: string,
): PowerMcqItemContent {
  if (!isRecord(value) || value.engine !== POWER_MCQ_ENGINE) {
    throw new Error(`${source} is not a ${POWER_MCQ_ENGINE} item.`);
  }
  if (!isPowerDomain(value.domain)) {
    throw new Error(`${source} has an unknown domain.`);
  }
  if (!(DIFFICULTY_TIERS as readonly unknown[]).includes(value.difficulty)) {
    throw new Error(`${source} is missing an intended difficulty.`);
  }

  const prompt = value.prompt ?? null;
  if (prompt !== null && (typeof prompt !== "string" || prompt.length === 0)) {
    throw new Error(`${source} has an empty prompt.`);
  }

  const stimulus = parseStimulus(value.stimulus, `${source} stimulus`);

  if (!Array.isArray(value.choices)) {
    throw new Error(`${source} is missing choices.`);
  }
  if (
    value.choices.length < POWER_MIN_CHOICES ||
    value.choices.length > POWER_MAX_CHOICES
  ) {
    throw new Error(
      `${source} needs between ${POWER_MIN_CHOICES} and ${POWER_MAX_CHOICES} choices.`,
    );
  }

  const seen = new Set<string>();
  const choices = value.choices.map((entry, index) => {
    const label = `${source} choice[${index}]`;
    if (!isRecord(entry)) {
      throw new Error(`${label} is not an object.`);
    }
    if (typeof entry.id !== "string" || entry.id.length === 0) {
      throw new Error(`${label} is missing id.`);
    }
    if (seen.has(entry.id)) {
      throw new Error(`${label} repeats id ${entry.id}.`);
    }
    seen.add(entry.id);
    return { id: entry.id, content: parseStimulus(entry.content, label) };
  });

  if (
    typeof value.correctChoiceId !== "string" ||
    !seen.has(value.correctChoiceId)
  ) {
    throw new Error(`${source} has a key that is not one of its choices.`);
  }

  return {
    engine: POWER_MCQ_ENGINE,
    domain: value.domain,
    prompt,
    stimulus,
    choices,
    correctChoiceId: value.correctChoiceId,
    difficulty: value.difficulty as DifficultyTier,
    anchor: value.anchor === true,
  };
}

function parseRevisionIdList(
  value: unknown,
  source: string,
  allowEmpty: boolean,
): string[] {
  if (value === undefined && allowEmpty) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(`${source} must be an array.`);
  }
  if (!allowEmpty && value.length === 0) {
    throw new Error(`${source} must not be empty.`);
  }
  const seen = new Set<string>();
  return value.map((entry, index) => {
    if (typeof entry !== "string" || entry.length === 0) {
      throw new Error(`${source}[${index}] is not an item revision id.`);
    }
    if (seen.has(entry)) {
      throw new Error(`${source} repeats ${entry}.`);
    }
    seen.add(entry);
    return entry;
  });
}

export function parsePowerFormDefinition(
  value: unknown,
  source: string,
): PowerFormDefinition {
  if (!isRecord(value) || value.engine !== POWER_FORM_ENGINE) {
    throw new Error(`${source} is not a ${POWER_FORM_ENGINE} definition.`);
  }
  if (!isPowerDomain(value.domain)) {
    throw new Error(`${source} has an unknown domain.`);
  }
  if (value.scoringModel !== ACCURACY_POWER_MODEL) {
    throw new Error(`${source} must be scored by ${ACCURACY_POWER_MODEL}.`);
  }

  const { sectionTimeLimitMs, itemCeilingMs } = value;
  if (
    typeof sectionTimeLimitMs !== "number" ||
    !Number.isInteger(sectionTimeLimitMs) ||
    sectionTimeLimitMs < POWER_MIN_SECTION_MS
  ) {
    throw new Error(`${source} has an invalid sectionTimeLimitMs.`);
  }
  if (
    typeof itemCeilingMs !== "number" ||
    !Number.isInteger(itemCeilingMs) ||
    itemCeilingMs < POWER_MIN_CEILING_MS ||
    itemCeilingMs > sectionTimeLimitMs
  ) {
    throw new Error(`${source} has an invalid itemCeilingMs.`);
  }

  const itemRevisionIds = parseRevisionIdList(
    value.itemRevisionIds,
    `${source} itemRevisionIds`,
    false,
  );
  const sampleItemRevisionIds = parseRevisionIdList(
    value.sampleItemRevisionIds,
    `${source} sampleItemRevisionIds`,
    true,
  );

  const scored = new Set(itemRevisionIds);
  for (const sample of sampleItemRevisionIds) {
    if (scored.has(sample)) {
      throw new Error(`${source} uses ${sample} as both sample and scored.`);
    }
  }

  return {
    engine: POWER_FORM_ENGINE,
    domain: value.domain,
    scoringModel: ACCURACY_POWER_MODEL,
    sectionTimeLimitMs,
    itemCeilingMs,
    sampleItemRevisionIds,
    itemRevisionIds,
  };
}

export function toClientPowerItem(
  content: PowerMcqItemContent,
  choiceOrder: string[],
): ClientPowerItem {
  const byId = new Map(content.choices.map((choice) => [choice.id, choice]));
  const choices = choiceOrder.map((id) => {
    const choice = byId.get(id);
    if (!choice) {
      throw new Error(`Unknown choice ${id} in presentation order.`);
    }
    return choice;
  });
  if (choices.length !== content.choices.length) {
    throw new Error("Presentation order does not cover every choice.");
  }
  return { prompt: content.prompt, stimulus: content.stimulus, choices };
}
