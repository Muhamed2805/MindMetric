import {
  BATTERY_DOMAINS,
  type BatteryDomain,
  DEVICE_CLASSES,
  type DeviceClass,
  isBatteryDomain,
  isPowerDomain,
} from "./battery";

export const QUALITY_RULES_ENGINE = "quality-rules-v1" as const;

/**
 * Severity is not a property of a flag: the same observation is advisory in one
 * domain and norm-disqualifying in another, so it is resolved per domain from a
 * versioned rule set (ADR 0017).
 */
export const QUALITY_SEVERITIES = ["info", "warning", "invalidating"] as const;

export const ELIGIBILITY_QUALITY_FLAGS = [
  "viewport_below_minimum",
  "device_class_not_normed",
] as const;

export const BEHAVIORAL_QUALITY_FLAGS = [
  "rapid_responding",
  "excessive_missingness",
  "focus_loss",
  "gs_trial_interrupted",
] as const;

export const TECHNICAL_QUALITY_FLAGS = [
  "too_few_responses",
  "impossible_timing",
] as const;

/**
 * Older rule versions may omit later flags. A detector fires only when the
 * loaded version maps that flag.
 */
export const QUALITY_FLAGS = [
  ...ELIGIBILITY_QUALITY_FLAGS,
  ...BEHAVIORAL_QUALITY_FLAGS,
  ...TECHNICAL_QUALITY_FLAGS,
] as const;

export const MAX_VISIBLE_QUALITY_WARNINGS = 2;

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

export type QualityThresholds = {
  rapidRespondingMs: number;
  rapidRespondingShare: number;
  missingnessShare: number;
  focusLossCount: number;
  tooFewResponsesShare: number;
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
  severity: Partial<Record<QualityFlag, SeverityRule>>;
  /** Omitted on older published versions so their snapshots stay byte-stable. */
  thresholds?: QualityThresholds | null;
};

export type QualityWarning = QualityObservation & {
  domain: BatteryDomain;
  position: number;
};

export type SectionQualityEvidence = {
  scoredItemCount: number;
  attempted: number;
  omitted: number;
  timedOut: number;
  notReached: number;
  answeredResponseTimesMs: number[];
  invalidTimingCount: number;
  focusLossCount: number;
  gsTrialInterrupted: boolean;
};

export type SectionQuality = {
  observations: QualityObservation[];
  sectionScored: boolean;
  sectionValid: boolean;
  normEligible: boolean;
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
  const severity: Partial<Record<QualityFlag, SeverityRule>> = {};
  for (const [flag, rule] of Object.entries(value.severity)) {
    if (!(QUALITY_FLAGS as readonly string[]).includes(flag)) {
      throw new Error(`${source} has an unknown flag ${flag}.`);
    }
    severity[flag as QualityFlag] = parseSeverityRule(
      rule,
      `${source} severity.${flag}`,
    );
  }
  if (Object.keys(severity).length === 0) {
    throw new Error(`${source} needs at least one severity mapping.`);
  }

  const thresholds = parseThresholds(value.thresholds, `${source} thresholds`);
  return {
    engine: QUALITY_RULES_ENGINE,
    provisional: value.provisional,
    normReferenceDeviceClass: value.normReferenceDeviceClass,
    domains,
    severity,
    ...(thresholds ? { thresholds } : {}),
  };
}

function parseShare(value: unknown, source: string): number {
  if (typeof value !== "number" || !(value > 0) || value > 1) {
    throw new Error(`${source} is not a share in (0, 1].`);
  }
  return value;
}

function parseThresholds(
  value: unknown,
  source: string,
): QualityThresholds | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!isRecord(value)) {
    throw new Error(`${source} is not an object.`);
  }
  const rapidRespondingMs = value.rapidRespondingMs;
  if (
    typeof rapidRespondingMs !== "number" ||
    !Number.isInteger(rapidRespondingMs) ||
    rapidRespondingMs < 200
  ) {
    throw new Error(`${source} has an invalid rapidRespondingMs.`);
  }
  const focusLossCount = value.focusLossCount;
  if (
    typeof focusLossCount !== "number" ||
    !Number.isInteger(focusLossCount) ||
    focusLossCount < 1
  ) {
    throw new Error(`${source} has an invalid focusLossCount.`);
  }
  return {
    rapidRespondingMs,
    rapidRespondingShare: parseShare(
      value.rapidRespondingShare,
      `${source} rapidRespondingShare`,
    ),
    missingnessShare: parseShare(
      value.missingnessShare,
      `${source} missingnessShare`,
    ),
    focusLossCount,
    tooFewResponsesShare: parseShare(
      value.tooFewResponsesShare,
      `${source} tooFewResponsesShare`,
    ),
  };
}

function resolveSeverity(
  definition: QualityRuleSetDefinition,
  flag: QualityFlag,
  domain: BatteryDomain,
): QualitySeverity | null {
  const rule = definition.severity[flag];
  if (!rule) {
    return null;
  }
  return rule.byDomain[domain] ?? rule.default;
}

function flagFamily(flag: QualityFlag) {
  if (flag === "viewport_below_minimum") {
    return "viewport";
  }
  if (flag === "device_class_not_normed") {
    return "device";
  }
  if (flag === "rapid_responding") {
    return "speed";
  }
  if (flag === "excessive_missingness") {
    return "missing";
  }
  if (flag === "focus_loss" || flag === "gs_trial_interrupted") {
    return "attention";
  }
  return "technical";
}

function observe(
  definition: QualityRuleSetDefinition,
  flag: QualityFlag,
  domain: BatteryDomain,
  measured: string,
  threshold: string,
): QualityObservation | null {
  const severity = resolveSeverity(definition, flag, domain);
  if (!severity) {
    return null;
  }
  return { flag, severity, measured, threshold };
}

function applyBehavioralConjunction(observations: QualityObservation[]) {
  const behavioral = observations.filter((row) =>
    (BEHAVIORAL_QUALITY_FLAGS as readonly string[]).includes(row.flag),
  );
  const families = new Set(behavioral.map((row) => flagFamily(row.flag)));
  if (families.size >= 2) {
    return observations;
  }
  return observations.map((row) => {
    if (
      !(BEHAVIORAL_QUALITY_FLAGS as readonly string[]).includes(row.flag) ||
      row.severity !== "invalidating"
    ) {
      return row;
    }
    return { ...row, severity: "warning" as const };
  });
}

/**
 * Behavioral detectors plus the two-signal rule (ADR 0017). Eligibility
 * observations from section start are included so the snapshot holds one
 * judged set. A single behavioral signal never hides a result; two
 * independent invalidating families can mark the section uninterpretable.
 */
export function evaluateSectionQuality(
  definition: QualityRuleSetDefinition,
  domain: BatteryDomain,
  eligibility: {
    deviceNormEligible: boolean;
    observations: QualityObservation[];
  },
  evidence: SectionQualityEvidence,
): SectionQuality {
  const detected: QualityObservation[] = [...eligibility.observations];
  const thresholds = definition.thresholds;
  const scored = evidence.scoredItemCount;

  if (thresholds && scored > 0) {
    const attemptedShare = evidence.attempted / scored;
    if (attemptedShare < thresholds.tooFewResponsesShare) {
      const row = observe(
        definition,
        "too_few_responses",
        domain,
        `${evidence.attempted}/${scored}`,
        String(thresholds.tooFewResponsesShare),
      );
      if (row) {
        detected.push(row);
      }
    } else {
      const missing =
        evidence.omitted + evidence.timedOut + evidence.notReached;
      if (missing / scored >= thresholds.missingnessShare) {
        const row = observe(
          definition,
          "excessive_missingness",
          domain,
          `${missing}/${scored}`,
          String(thresholds.missingnessShare),
        );
        if (row) {
          detected.push(row);
        }
      }
    }

    if (isPowerDomain(domain) && evidence.answeredResponseTimesMs.length > 0) {
      const fast = evidence.answeredResponseTimesMs.filter(
        (ms) => ms < thresholds.rapidRespondingMs,
      ).length;
      if (
        fast / evidence.answeredResponseTimesMs.length >=
        thresholds.rapidRespondingShare
      ) {
        const row = observe(
          definition,
          "rapid_responding",
          domain,
          `${fast}/${evidence.answeredResponseTimesMs.length}`,
          `${thresholds.rapidRespondingMs}ms`,
        );
        if (row) {
          detected.push(row);
        }
      }
    }

    if (evidence.focusLossCount >= thresholds.focusLossCount) {
      const row = observe(
        definition,
        "focus_loss",
        domain,
        String(evidence.focusLossCount),
        String(thresholds.focusLossCount),
      );
      if (row) {
        detected.push(row);
      }
    }
  }

  if (evidence.gsTrialInterrupted) {
    const row = observe(
      definition,
      "gs_trial_interrupted",
      domain,
      "interrupted",
      "in-trial",
    );
    if (row) {
      detected.push(row);
    }
  }

  if (evidence.invalidTimingCount > 0) {
    const row = observe(
      definition,
      "impossible_timing",
      domain,
      String(evidence.invalidTimingCount),
      "0",
    );
    if (row) {
      detected.push(row);
    }
  }

  const judged = applyBehavioralConjunction(detected);
  const technicalInvalid = judged.some(
    (row) =>
      (TECHNICAL_QUALITY_FLAGS as readonly string[]).includes(row.flag) &&
      row.severity === "invalidating",
  );
  const behavioralFamilies = new Set(
    judged
      .filter((row) =>
        (BEHAVIORAL_QUALITY_FLAGS as readonly string[]).includes(row.flag),
      )
      .map((row) => flagFamily(row.flag)),
  );
  const anyInvalid = judged.some((row) => row.severity === "invalidating");
  const singleStrongBehavioral = judged.some(
    (row) =>
      (BEHAVIORAL_QUALITY_FLAGS as readonly string[]).includes(row.flag) &&
      row.severity === "warning" &&
      resolveSeverity(definition, row.flag, domain) === "invalidating",
  );

  const sectionValid = !technicalInvalid && behavioralFamilies.size < 2;
  return {
    observations: judged,
    sectionScored: scored > 0,
    sectionValid,
    normEligible:
      eligibility.deviceNormEligible &&
      sectionValid &&
      !anyInvalid &&
      !singleStrongBehavioral,
  };
}

export function pickVisibleWarnings(
  sections: Array<{
    domain: BatteryDomain;
    position: number;
    observations: QualityObservation[];
  }>,
): QualityWarning[] {
  const rows: QualityWarning[] = [];
  for (const section of sections) {
    for (const observation of section.observations) {
      if (observation.severity === "info") {
        continue;
      }
      rows.push({
        ...observation,
        domain: section.domain,
        position: section.position,
      });
    }
  }
  rows.sort((left, right) => {
    if (left.severity !== right.severity) {
      return left.severity === "invalidating" ? -1 : 1;
    }
    return left.position - right.position;
  });
  return rows.slice(0, MAX_VISIBLE_QUALITY_WARNINGS);
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
        severity:
          resolveSeverity(definition, "viewport_below_minimum", domain) ??
          "info",
        measured: "unknown",
        threshold,
      });
    } else if (width < minimum.widthPx || height < minimum.heightPx) {
      observations.push({
        flag: "viewport_below_minimum",
        severity:
          resolveSeverity(definition, "viewport_below_minimum", domain) ??
          "info",
        measured: `${width}x${height}`,
        threshold,
      });
    }
  }

  if (rule.normIneligibleDeviceClasses.includes(covariates.deviceClass)) {
    observations.push({
      flag: "device_class_not_normed",
      severity:
        resolveSeverity(definition, "device_class_not_normed", domain) ??
        "info",
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
