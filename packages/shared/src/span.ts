import { shuffleForPresentation } from "./battery-session";

export const SPAN_TRIAL_ENGINE = "span-trial-v1" as const;
export const SPAN_FORM_ENGINE = "span-form-v1" as const;
export const SPAN_PARTIAL_MODEL = "span-partial-v1" as const;
export const SPAN_SPATIAL_REVERSE = "spatial-reverse-v1" as const;
export const SPAN_GENERATOR_VERSION = "spatial-reverse-v1" as const;
export const SPAN_FAMILY_ID = "fam_wm_spatial_reverse" as const;

export const SPAN_RECALLS = ["forward", "reverse"] as const;
export const SPAN_MIN_LENGTH = 2;
export const SPAN_MAX_LENGTH = 9;
export const SPAN_MIN_SCORED_LENGTH = 3;
export const SPAN_MIN_STIMULUS_MS = 200;
export const SPAN_MIN_RECALL_MS = 5_000;
export const SPAN_MIN_SECTION_MS = 60_000;
export const SPAN_MIN_GRID = 3;
export const SPAN_MAX_GRID = 4;

export type SpanRecall = (typeof SPAN_RECALLS)[number];

export type SpanGrid = {
  rows: number;
  cols: number;
};

export type SpanTrialContent = {
  engine: typeof SPAN_TRIAL_ENGINE;
  domain: "gwm";
  procedure: typeof SPAN_SPATIAL_REVERSE;
  length: number;
  recall: SpanRecall;
  grid: SpanGrid;
};

export type SpanFormDefinition = {
  engine: typeof SPAN_FORM_ENGINE;
  domain: "gwm";
  scoringModel: typeof SPAN_PARTIAL_MODEL;
  sectionTimeLimitMs: number;
  stimulusMs: number;
  isiMs: number;
  recallCeilingMs: number;
  sampleItemRevisionIds: string[];
  itemRevisionIds: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseGrid(value: unknown, source: string): SpanGrid {
  if (!isRecord(value)) {
    throw new Error(`${source} grid is not an object.`);
  }
  const { rows, cols } = value;
  if (
    typeof rows !== "number" ||
    !Number.isInteger(rows) ||
    rows < SPAN_MIN_GRID ||
    rows > SPAN_MAX_GRID
  ) {
    throw new Error(`${source} has an invalid grid row count.`);
  }
  if (
    typeof cols !== "number" ||
    !Number.isInteger(cols) ||
    cols < SPAN_MIN_GRID ||
    cols > SPAN_MAX_GRID
  ) {
    throw new Error(`${source} has an invalid grid column count.`);
  }
  return { rows, cols };
}

export function parseSpanTrialContent(
  value: unknown,
  source: string,
): SpanTrialContent {
  if (!isRecord(value) || value.engine !== SPAN_TRIAL_ENGINE) {
    throw new Error(`${source} is not a ${SPAN_TRIAL_ENGINE} trial.`);
  }
  if (value.domain !== "gwm") {
    throw new Error(`${source} must measure gwm.`);
  }
  if (value.procedure !== SPAN_SPATIAL_REVERSE) {
    throw new Error(`${source} has an unknown span procedure.`);
  }
  if (!(SPAN_RECALLS as readonly unknown[]).includes(value.recall)) {
    throw new Error(`${source} has an unknown recall direction.`);
  }
  const { length } = value;
  if (
    typeof length !== "number" ||
    !Number.isInteger(length) ||
    length < SPAN_MIN_LENGTH ||
    length > SPAN_MAX_LENGTH
  ) {
    throw new Error(`${source} has an invalid span length.`);
  }
  const grid = parseGrid(value.grid, source);
  if (length > grid.rows * grid.cols) {
    throw new Error(`${source} is longer than the grid.`);
  }

  return {
    engine: SPAN_TRIAL_ENGINE,
    domain: "gwm",
    procedure: SPAN_SPATIAL_REVERSE,
    length,
    recall: value.recall as SpanRecall,
    grid,
  };
}

export function parseSpanFormDefinition(
  value: unknown,
  source: string,
): SpanFormDefinition {
  if (!isRecord(value) || value.engine !== SPAN_FORM_ENGINE) {
    throw new Error(`${source} is not a ${SPAN_FORM_ENGINE} form.`);
  }
  if (value.domain !== "gwm") {
    throw new Error(`${source} must measure gwm.`);
  }
  if (value.scoringModel !== SPAN_PARTIAL_MODEL) {
    throw new Error(`${source} must use ${SPAN_PARTIAL_MODEL}.`);
  }
  if (
    typeof value.sectionTimeLimitMs !== "number" ||
    !Number.isInteger(value.sectionTimeLimitMs) ||
    value.sectionTimeLimitMs < SPAN_MIN_SECTION_MS
  ) {
    throw new Error(`${source} has an invalid sectionTimeLimitMs.`);
  }
  if (
    typeof value.stimulusMs !== "number" ||
    !Number.isInteger(value.stimulusMs) ||
    value.stimulusMs < SPAN_MIN_STIMULUS_MS
  ) {
    throw new Error(`${source} has an invalid stimulusMs.`);
  }
  if (
    typeof value.isiMs !== "number" ||
    !Number.isInteger(value.isiMs) ||
    value.isiMs < 0
  ) {
    throw new Error(`${source} has an invalid isiMs.`);
  }
  if (
    typeof value.recallCeilingMs !== "number" ||
    !Number.isInteger(value.recallCeilingMs) ||
    value.recallCeilingMs < SPAN_MIN_RECALL_MS
  ) {
    throw new Error(`${source} has an invalid recallCeilingMs.`);
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
    engine: SPAN_FORM_ENGINE,
    domain: "gwm",
    scoringModel: SPAN_PARTIAL_MODEL,
    sectionTimeLimitMs: value.sectionTimeLimitMs,
    stimulusMs: value.stimulusMs,
    isiMs: value.isiMs,
    recallCeilingMs: value.recallCeilingMs,
    sampleItemRevisionIds: sampleItemRevisionIds as string[],
    itemRevisionIds: itemRevisionIds as string[],
  };
}

export function isSpanTrialContent(value: unknown): value is SpanTrialContent {
  return isRecord(value) && value.engine === SPAN_TRIAL_ENGINE;
}

export function isSpanFormDefinition(
  value: unknown,
): value is SpanFormDefinition {
  return isRecord(value) && value.engine === SPAN_FORM_ENGINE;
}

export function spanCellId(row: number, col: number) {
  return `r${row}c${col}`;
}

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One sequence per session. A fixed bank would leak on first exposure
 * (ADR 0015). Cells are unique within a trial.
 */
export function generateSpatialSequence(input: {
  length: number;
  rows: number;
  cols: number;
  seed: string;
}): string[] {
  const cells: string[] = [];
  for (let row = 1; row <= input.rows; row += 1) {
    for (let col = 1; col <= input.cols; col += 1) {
      cells.push(spanCellId(row, col));
    }
  }
  if (input.length > cells.length) {
    throw new Error("Span length is longer than the grid.");
  }
  return shuffleForPresentation(cells, mulberry32(hashSeed(input.seed))).slice(
    0,
    input.length,
  );
}

export function spanRecallTarget(
  sequence: readonly string[],
  recall: SpanRecall,
) {
  return recall === "reverse" ? [...sequence].reverse() : [...sequence];
}

export function spanGridCells(grid: SpanGrid) {
  const cells: string[] = [];
  for (let row = 1; row <= grid.rows; row += 1) {
    for (let col = 1; col <= grid.cols; col += 1) {
      cells.push(spanCellId(row, col));
    }
  }
  return cells;
}

export function buildSpanPresentation(grid: SpanGrid) {
  return { choiceOrder: spanGridCells(grid) };
}

export function spanPresentationMs(
  form: Pick<SpanFormDefinition, "stimulusMs" | "isiMs">,
  length: number,
) {
  return length * form.stimulusMs + Math.max(0, length - 1) * form.isiMs;
}

export function spanTrialCeilingMs(
  form: Pick<SpanFormDefinition, "stimulusMs" | "isiMs" | "recallCeilingMs">,
  length: number,
) {
  return spanPresentationMs(form, length) + form.recallCeilingMs;
}

export function parseSpanSequence(value: unknown, source: string): string[] {
  if (!isRecord(value) || !Array.isArray(value.sequence)) {
    throw new Error(`${source} is missing the generated sequence.`);
  }
  const sequence: string[] = [];
  const seen = new Set<string>();
  for (const [index, entry] of value.sequence.entries()) {
    if (typeof entry !== "string" || entry.length === 0) {
      throw new Error(`${source} sequence[${index}] is not a cell id.`);
    }
    if (seen.has(entry)) {
      throw new Error(`${source} sequence repeats ${entry}.`);
    }
    seen.add(entry);
    sequence.push(entry);
  }
  if (sequence.length === 0) {
    throw new Error(`${source} sequence is empty.`);
  }
  return sequence;
}

export function parseSpanRecall(value: unknown, source: string): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(`${source} must be an array.`);
  }
  return value.map((entry, index) => {
    if (typeof entry !== "string" || entry.length === 0) {
      throw new Error(`${source}[${index}] is not a cell id.`);
    }
    return entry;
  });
}

export function spanPositionCredits(
  sequence: readonly string[],
  recall: SpanRecall,
  recalled: readonly string[] | null,
) {
  const target = spanRecallTarget(sequence, recall);
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

export type ClientSpanTrial = {
  engine: typeof SPAN_TRIAL_ENGINE;
  prompt: string;
  procedure: typeof SPAN_SPATIAL_REVERSE;
  length: number;
  recall: SpanRecall;
  grid: SpanGrid;
  sequence: string[];
  stimulusMs: number;
  isiMs: number;
};

export function toClientSpanTrial(
  content: SpanTrialContent,
  sequence: readonly string[],
  form: Pick<SpanFormDefinition, "stimulusMs" | "isiMs">,
): ClientSpanTrial {
  return {
    engine: SPAN_TRIAL_ENGINE,
    prompt:
      content.recall === "reverse"
        ? "Watch the highlighted cells, then tap them in reverse order."
        : "Watch the highlighted cells, then tap them in the same order.",
    procedure: content.procedure,
    length: content.length,
    recall: content.recall,
    grid: content.grid,
    sequence: [...sequence],
    stimulusMs: form.stimulusMs,
    isiMs: form.isiMs,
  };
}
