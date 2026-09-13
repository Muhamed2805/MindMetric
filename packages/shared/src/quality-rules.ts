import {
  BATTERY_DOMAINS,
  type BatteryDomain,
  DEVICE_CLASSES,
  type DeviceClass,
  isBatteryDomain,
} from "./battery";

export const QUALITY_RULES_ENGINE = "quality-rules-v1" as const;

/**
 * Severity is not a property of a flag: the same observation is advisory in one
 * domain and norm-disqualifying in another, so it is resolved per domain from a
 * versioned rule set (ADR 0017).
 */
export const QUALITY_SEVERITIES = ["info", "warning", "invalidating"] as const;

/**
 * The device and viewport family, which is all that is decided at section
 * start. Behavioral families arrive with their detectors as a later rule
 * version rather than as a rewrite of this one.
 */
export const QUALITY_FLAGS = [
  "viewport_below_minimum",
  "device_class_not_normed",
] as const;

export type QualitySeverity = (typeof QUALITY_SEVERITIES)[number];
export type QualityFlag = (typeof QUALITY_FLAGS)[number];

export type ViewportMinimum = {
  widthPx: number;
  heightPx: number;
};

export type DomainQualityRule = {
  /** Null means the domain places no demand on screen size. */
  minViewport: ViewportMinimum | null;
  /** Device classes kept out of the primary norming sample for this domain. */
  normIneligibleDeviceClasses: DeviceClass[];
};

export type SeverityRule = {
  default: QualitySeverity;
  byDomain: Partial<Record<BatteryDomain, QualitySeverity>>;
};

export type QualityRuleSetDefinition = {
  engine: typeof QUALITY_RULES_ENGINE;
  /**
   * V1 thresholds are estimates, not measurements. S2 replaces them from
   * observed distributions; this flag keeps that visible in every snapshot.
   */
  provisional: boolean;
  /** Platform the norms treat as reference; others are strata, not errors. */
  normReferenceDeviceClass: DeviceClass;
  domains: Record<BatteryDomain, DomainQualityRule>;
  severity: Record<QualityFlag, SeverityRule>;
};

export type SectionCovariates = {
  deviceClass: DeviceClass;
  viewportWidth: number | null;
  viewportHeight: number | null;
};

export type QualityObservation = {
  flag: QualityFlag;
  severity: QualitySeverity;
  /** Stored so a re-evaluation can be compared against what was measured. */
  measured: string;
  threshold: string;
};

/**
 * Covers the device and viewport family only. Session-level eligibility
 * (attempt number, practice mode, administration context) is decided
 * separately and does not raise a user-facing warning (ADR 0017).
 */
export type SectionEligibility = {
  normEligible: boolean;
  observations: QualityObservation[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSeverity(value: unknown): value is QualitySeverity {
  return (QUALITY_SEVERITIES as readonly unknown[]).includes(value);
}

function isDeviceClass(value: unknown): value is DeviceClass {
  return (DEVICE_CLASSES as readonly unknown[]).includes(value);
}

function parsePixels(value: unknown, source: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`${source} is not a pixel count.`);
  }
  return value;
}

function parseViewportMinimum(
  value: unknown,
  source: string,
): ViewportMinimum | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isRecord(value)) {
    throw new Error(`${source} is not an object.`);
  }
  return {
    widthPx: parsePixels(value.widthPx, `${source} widthPx`),
    heightPx: parsePixels(value.heightPx, `${source} heightPx`),
  };
}

function parseDomainRule(value: unknown, source: string): DomainQualityRule {
  if (!isRecord(value)) {
    throw new Error(`${source} is not an object.`);
  }
  const classes = value.normIneligibleDeviceClasses ?? [];
  if (!Array.isArray(classes)) {
    throw new Error(`${source} normIneligibleDeviceClasses must be an array.`);
  }
  const seen = new Set<DeviceClass>();
  for (const entry of classes) {
    if (!isDeviceClass(entry)) {
      throw new Error(`${source} lists unknown device class ${String(entry)}.`);
    }
    if (seen.has(entry)) {
      throw new Error(`${source} repeats device class ${entry}.`);
    }
    seen.add(entry);
  }
  return {
    minViewport: parseViewportMinimum(
      value.minViewport,
      `${source} minViewport`,
    ),
    normIneligibleDeviceClasses: [...seen],
  };
}

function parseSeverityRule(value: unknown, source: string): SeverityRule {
  if (!isRecord(value)) {
    throw new Error(`${source} is not an object.`);
  }
  if (!isSeverity(value.default)) {
    throw new Error(`${source} is missing a default severity.`);
  }
  const byDomain: Partial<Record<BatteryDomain, QualitySeverity>> = {};
  const overrides = value.byDomain ?? {};
  if (!isRecord(overrides)) {
    throw new Error(`${source} byDomain is not an object.`);
  }
  for (const [domain, severity] of Object.entries(overrides)) {
    if (!isBatteryDomain(domain)) {
      throw new Error(`${source} byDomain has unknown domain ${domain}.`);
    }
    if (!isSeverity(severity)) {
      throw new Error(`${source} byDomain.${domain} is not a severity.`);
    }
    byDomain[domain] = severity;
  }
  return { default: value.default, byDomain };
}

export function parseQualityRuleSetDefinition(
  value: unknown,
  source: string,
): QualityRuleSetDefinition {
  if (!isRecord(value) || value.engine !== QUALITY_RULES_ENGINE) {
    throw new Error(`${source} is not a ${QUALITY_RULES_ENGINE} rule set.`);
  }
  if (typeof value.provisional !== "boolean") {
    throw new Error(`${source} must state whether it is provisional.`);
  }
  if (!isDeviceClass(value.normReferenceDeviceClass)) {
    throw new Error(`${source} is missing normReferenceDeviceClass.`);
  }

  if (!isRecord(value.domains)) {
    throw new Error(`${source} is missing domain rules.`);
  }
  const domains = {} as Record<BatteryDomain, DomainQualityRule>;
  for (const domain of BATTERY_DOMAINS) {
    const rule = value.domains[domain];
    if (rule === undefined) {
      throw new Error(`${source} has no rule for domain ${domain}.`);
    }
    domains[domain] = parseDomainRule(rule, `${source} domains.${domain}`);
  }
  for (const key of Object.keys(value.domains)) {
    if (!isBatteryDomain(key)) {
      throw new Error(`${source} has a rule for unknown domain ${key}.`);
    }
  }

  if (!isRecord(value.severity)) {
    throw new Error(`${source} is missing severity mappings.`);
  }
  const severity = {} as Record<QualityFlag, SeverityRule>;
  for (const flag of QUALITY_FLAGS) {
    const rule = value.severity[flag];
    if (rule === undefined) {
      throw new Error(`${source} has no severity mapping for ${flag}.`);
    }
    severity[flag] = parseSeverityRule(rule, `${source} severity.${flag}`);
  }

  return {
    engine: QUALITY_RULES_ENGINE,
    provisional: value.provisional,
    normReferenceDeviceClass: value.normReferenceDeviceClass,
    domains,
    severity,
  };
}

function resolveSeverity(
  definition: QualityRuleSetDefinition,
  flag: QualityFlag,
  domain: BatteryDomain,
): QualitySeverity {
  const rule = definition.severity[flag];
  return rule.byDomain[domain] ?? rule.default;
}

/**
 * Decided when a section starts, because the covariates it reads are
 * snapshotted there. A section that is not norm-eligible still runs and is
 * still shown to the examinee; it just stays out of the norming sample
 * (ADR 0014).
 */
export function resolveSectionEligibility(
  definition: QualityRuleSetDefinition,
  domain: BatteryDomain,
  covariates: SectionCovariates,
): SectionEligibility {
  const rule = definition.domains[domain];
  const observations: QualityObservation[] = [];

  const minimum = rule.minViewport;
  if (minimum) {
    const threshold = `${minimum.widthPx}x${minimum.heightPx}`;
    const { viewportWidth: width, viewportHeight: height } = covariates;
    if (width === null || height === null) {
      observations.push({
        flag: "viewport_below_minimum",
        severity: resolveSeverity(definition, "viewport_below_minimum", domain),
        measured: "unknown",
        threshold,
      });
    } else if (width < minimum.widthPx || height < minimum.heightPx) {
      observations.push({
        flag: "viewport_below_minimum",
        severity: resolveSeverity(definition, "viewport_below_minimum", domain),
        measured: `${width}x${height}`,
        threshold,
      });
    }
  }

  if (rule.normIneligibleDeviceClasses.includes(covariates.deviceClass)) {
    observations.push({
      flag: "device_class_not_normed",
      severity: resolveSeverity(definition, "device_class_not_normed", domain),
      measured: covariates.deviceClass,
      threshold: rule.normIneligibleDeviceClasses.join(","),
    });
  }

  return {
    normEligible: !observations.some(
      (observation) => observation.severity === "invalidating",
    ),
    observations,
  };
}
