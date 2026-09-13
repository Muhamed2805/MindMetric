import {
  isLikertDefinition,
  LIKERT_ENGINE,
  type LikertDefinition,
} from "./likert";

export const INSTRUMENT_ENGINES = [LIKERT_ENGINE] as const;

export type InstrumentEngineId = (typeof INSTRUMENT_ENGINES)[number];

export type EngineDefinition = LikertDefinition;

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
  if (!isLikertDefinition(value) || value.engine !== kind) {
    throw new Error(`Invalid ${kind} definition.`);
  }
  return value;
}
