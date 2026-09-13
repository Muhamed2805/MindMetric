import {
  type PowerFormDefinition,
  type PowerMcqItemContent,
  parsePowerFormDefinition,
  parsePowerMcqItemContent,
} from "./power-mcq";
import {
  isSpeedFormDefinition,
  parseSpeedFormDefinition,
  parseSpeedTrialContent,
  type SpeedFormDefinition,
  type SpeedTrialContent,
} from "./speed";

export type AdministeredForm = PowerFormDefinition | SpeedFormDefinition;
export type AdministeredItemContent = PowerMcqItemContent | SpeedTrialContent;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseAdministeredForm(
  value: unknown,
  source: string,
): AdministeredForm {
  if (isRecord(value) && isSpeedFormDefinition(value)) {
    return parseSpeedFormDefinition(value, source);
  }
  return parsePowerFormDefinition(value, source);
}

export function parseAdministeredItemContent(
  value: unknown,
  source: string,
): AdministeredItemContent {
  if (isRecord(value) && value.engine === "speed-trial-v1") {
    return parseSpeedTrialContent(value, source);
  }
  return parsePowerMcqItemContent(value, source);
}

/** Time under a clock once samples are done. */
export function formSectionTimeLimitMs(form: AdministeredForm): number {
  return isSpeedFormDefinition(form)
    ? form.itemRevisionIds.length * form.trialTimeLimitMs
    : form.sectionTimeLimitMs;
}

/** Per scored item or trial. */
export function formItemCeilingMs(form: AdministeredForm): number {
  return isSpeedFormDefinition(form)
    ? form.trialTimeLimitMs
    : form.itemCeilingMs;
}
