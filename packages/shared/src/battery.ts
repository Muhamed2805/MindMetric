export const BATTERY_ENGINE = "battery-v1" as const;
export const BATTERY_PROFILE_MODEL = "battery-profile-v1" as const;

/** Domains measured by the core cognitive battery (ADR 0014). No verbal/Gc in V1. */
export const BATTERY_DOMAINS = ["gf", "gs", "rq", "gv", "gwm"] as const;

/** Domains served by the power multiple-choice engine. */
export const POWER_DOMAINS = ["gf", "rq", "gv"] as const;

export const BATTERY_SESSION_STATUSES = [
  "in_progress",
  "completed",
  "abandoned",
  "expired",
] as const;

export const SECTION_STATUSES = [
  "pending",
  "in_progress",
  "submitted",
  "expired",
] as const;

/** Lifecycle of a presented item. `not_reached` items are never shown. */
export const ITEM_INSTANCE_STATUSES = [
  "pending",
  "answered",
  "omitted",
  "timed_out",
  "not_reached",
] as const;

/**
 * Stored response codes. Correctness is never stored: it is derived at scoring
 * time from the choice and the key, so a key correction can be re-scored.
 */
export const RESPONSE_CODES = [
  "answered",
  "omitted",
  "timed_out",
  "post_deadline",
  "invalid",
] as const;

/** Response codes plus the one state that has no response row. */
export const ITEM_OUTCOMES = [...RESPONSE_CODES, "not_reached"] as const;

export const ITEM_ROLES = ["scored", "sample"] as const;

export const DEVICE_CLASSES = [
  "desktop",
  "tablet",
  "phone",
  "unknown",
] as const;

export const INPUT_MODES = ["mouse", "touch", "keyboard", "other"] as const;

export const ADMINISTRATION_CONTEXTS = [
  "battery",
  "standalone",
  "practice",
] as const;

/** Placeholder pin for snapshots taken before norms or quality rules exist. */
export const VERSION_PIN_NONE = "none" as const;

export type BatteryDomain = (typeof BATTERY_DOMAINS)[number];
export type PowerDomain = (typeof POWER_DOMAINS)[number];
export type BatterySessionStatus = (typeof BATTERY_SESSION_STATUSES)[number];
export type SectionStatus = (typeof SECTION_STATUSES)[number];
export type ItemInstanceStatus = (typeof ITEM_INSTANCE_STATUSES)[number];
export type ResponseCode = (typeof RESPONSE_CODES)[number];
export type ItemOutcome = (typeof ITEM_OUTCOMES)[number];
export type ItemRole = (typeof ITEM_ROLES)[number];
export type DeviceClass = (typeof DEVICE_CLASSES)[number];
export type InputMode = (typeof INPUT_MODES)[number];
export type AdministrationContext = (typeof ADMINISTRATION_CONTEXTS)[number];

export type BatterySection = {
  position: number;
  domain: BatteryDomain;
  formVersionId: string;
  breakAfter: boolean;
  breakMaxMs: number | null;
};

export type BatteryDefinition = {
  engine: typeof BATTERY_ENGINE;
  sections: BatterySection[];
};

export const BREAK_MIN_MS = 15_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isBatteryDomain(value: unknown): value is BatteryDomain {
  return (BATTERY_DOMAINS as readonly unknown[]).includes(value);
}

export function isPowerDomain(value: unknown): value is PowerDomain {
  return (POWER_DOMAINS as readonly unknown[]).includes(value);
}

function parseBatterySection(value: unknown, source: string): BatterySection {
  if (!isRecord(value)) {
    throw new Error(`${source} is not an object.`);
  }
  const { position, domain, formVersionId } = value;
  if (
    typeof position !== "number" ||
    !Number.isInteger(position) ||
    position < 1
  ) {
    throw new Error(`${source} has an invalid position.`);
  }
  if (!isBatteryDomain(domain)) {
    throw new Error(`${source} has an unknown domain.`);
  }
  if (typeof formVersionId !== "string" || formVersionId.length === 0) {
    throw new Error(`${source} is missing formVersionId.`);
  }
  const breakAfter = value.breakAfter === true;
  const rawBreakMs = value.breakMaxMs ?? null;
  if (rawBreakMs !== null) {
    if (
      typeof rawBreakMs !== "number" ||
      !Number.isInteger(rawBreakMs) ||
      rawBreakMs < BREAK_MIN_MS
    ) {
      throw new Error(`${source} has an invalid breakMaxMs.`);
    }
  }
  if (breakAfter && rawBreakMs === null) {
    throw new Error(`${source} allows a break without breakMaxMs.`);
  }
  return {
    position,
    domain,
    formVersionId,
    breakAfter,
    breakMaxMs: breakAfter ? (rawBreakMs as number) : null,
  };
}

export function parseBatteryDefinition(
  value: unknown,
  source: string,
): BatteryDefinition {
  if (!isRecord(value) || value.engine !== BATTERY_ENGINE) {
    throw new Error(`${source} is not a ${BATTERY_ENGINE} definition.`);
  }
  if (!Array.isArray(value.sections) || value.sections.length === 0) {
    throw new Error(`${source} needs at least one section.`);
  }

  const sections = value.sections
    .map((entry, index) =>
      parseBatterySection(entry, `${source} section[${index}]`),
    )
    .sort((left, right) => left.position - right.position);

  const domains = new Set<BatteryDomain>();
  const formVersionIds = new Set<string>();
  sections.forEach((section, index) => {
    if (section.position !== index + 1) {
      throw new Error(
        `${source} section positions must start at 1 and be contiguous.`,
      );
    }
    if (domains.has(section.domain)) {
      throw new Error(`${source} measures ${section.domain} twice.`);
    }
    domains.add(section.domain);
    if (formVersionIds.has(section.formVersionId)) {
      throw new Error(
        `${source} reuses form version ${section.formVersionId}.`,
      );
    }
    formVersionIds.add(section.formVersionId);
  });

  const last = sections[sections.length - 1];
  if (last?.breakAfter) {
    throw new Error(`${source} allows a break after the final section.`);
  }

  return { engine: BATTERY_ENGINE, sections };
}
