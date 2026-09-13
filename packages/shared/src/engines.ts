import {
  isLikertDefinition,
  LIKERT_ENGINE,
  type LikertDefinition,
} from "./likert";
import {
  isMcqTimedDefinition,
  MCQ_TIMED_ENGINE,
  type McqTimedDefinition,
} from "./mcq";

export const INSTRUMENT_ENGINES = [LIKERT_ENGINE, MCQ_TIMED_ENGINE] as const;

export type InstrumentEngineId = (typeof INSTRUMENT_ENGINES)[number];

export type EngineDefinition = LikertDefinition | McqTimedDefinition;

export function isInstrumentEngineId(
  value: string,
): value is InstrumentEngineId {
  return (INSTRUMENT_ENGINES as readonly string[]).includes(value);
}

export function parseEngineDefinition(
  kind: string,
  value: unknown,
): EngineDefinition {
  if (!isInstrumentEngineId(kind)) {
    throw new Error(`Unknown instrument engine: ${kind}`);
  }
  if (kind === LIKERT_ENGINE) {
    if (!isLikertDefinition(value) || value.engine !== kind) {
      throw new Error(`Invalid ${kind} definition.`);
    }
    return value;
  }
  if (!isMcqTimedDefinition(value) || value.engine !== kind) {
    throw new Error(`Invalid ${kind} definition.`);
  }
  return value;
}

export function definitionItemCount(definition: EngineDefinition) {
  return definition.items.length;
}

export function definitionEstimatedSeconds(definition: EngineDefinition) {
  if (isMcqTimedDefinition(definition)) {
    const ms = definition.items.reduce(
      (total, item) => total + item.timeLimitMs,
      0,
    );
    return Math.max(1, Math.ceil(ms / 1000));
  }
  return Math.max(60, Math.round(definition.items.length * 24));
}
