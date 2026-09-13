import { describe, expect, it } from "vitest";
import {
  evaluateSectionQuality,
  parseQualityRuleSetDefinition,
  pickVisibleWarnings,
  type QualityObservation,
  type QualityRuleSetDefinition,
  resolveSectionEligibility,
  type SectionQualityEvidence,
} from "./quality-rules";

const openDomain = { minViewport: null, normIneligibleDeviceClasses: [] };

const definition = {
  engine: "quality-rules-v1",
  provisional: true,
  normReferenceDeviceClass: "desktop",
  domains: {
    gf: openDomain,
    gs: openDomain,
    rq: openDomain,
    gv: {
      minViewport: { widthPx: 820, heightPx: 640 },
      normIneligibleDeviceClasses: ["phone"],
    },
    gwm: openDomain,
  },
  severity: {
    viewport_below_minimum: {
      default: "info",
      byDomain: { gv: "invalidating" },
    },
    device_class_not_normed: {
      default: "info",
      byDomain: { gv: "invalidating" },
    },
  },
};

function parsed(): QualityRuleSetDefinition {
  return parseQualityRuleSetDefinition(definition, "rules");
}

describe("parseQualityRuleSetDefinition", () => {
  it("requires a rule for every battery domain", () => {
    const { gf, gs, rq, gv } = definition.domains;
    expect(() =>
      parseQualityRuleSetDefinition(
        { ...definition, domains: { gf, gs, rq, gv } },
        "rules",
      ),
    ).toThrow(/no rule for domain gwm/);
  });

  it("requires the provisional flag to be stated", () => {
    expect(() =>
      parseQualityRuleSetDefinition(
        { ...definition, provisional: undefined },
        "rules",
      ),
    ).toThrow(/whether it is provisional/);
  });

  it("rejects an unknown flag rather than inventing a mapping", () => {
    expect(() =>
      parseQualityRuleSetDefinition(
        {
          ...definition,
          severity: {
            ...definition.severity,
            invented_flag: { default: "warning" },
          },
        },
        "rules",
      ),
    ).toThrow(/unknown flag/);
  });

  it("allows an older rule set to omit later flags", () => {
    expect(parsed().severity.rapid_responding).toBeUndefined();
    expect(parsed().thresholds ?? null).toBeNull();
  });

  it("rejects a rule for an unknown domain", () => {
    expect(() =>
      parseQualityRuleSetDefinition(
        {
          ...definition,
          domains: { ...definition.domains, verbal: openDomain },
        },
        "rules",
      ),
    ).toThrow(/unknown domain verbal/);
  });
});

describe("resolveSectionEligibility", () => {
  const desktop = {
    deviceClass: "desktop" as const,
    viewportWidth: 1440,
    viewportHeight: 900,
  };

  it("accepts a domain that places no demand on the screen", () => {
    const result = resolveSectionEligibility(parsed(), "gf", {
      deviceClass: "phone",
      viewportWidth: 375,
      viewportHeight: 667,
    });

    expect(result.normEligible).toBe(true);
    expect(result.observations).toEqual([]);
  });

  it("accepts spatial reasoning on a large enough screen", () => {
    const result = resolveSectionEligibility(parsed(), "gv", desktop);

    expect(result.normEligible).toBe(true);
    expect(result.observations).toEqual([]);
  });

  it("keeps a too-small spatial section out of the norming sample", () => {
    const result = resolveSectionEligibility(parsed(), "gv", {
      deviceClass: "phone",
      viewportWidth: 375,
      viewportHeight: 667,
    });

    expect(result.normEligible).toBe(false);
    expect(result.observations.map((entry) => entry.flag)).toEqual([
      "viewport_below_minimum",
      "device_class_not_normed",
    ]);
  });

  it("records what was measured against the threshold in force", () => {
    const [observation] = resolveSectionEligibility(parsed(), "gv", {
      deviceClass: "desktop",
      viewportWidth: 800,
      viewportHeight: 700,
    }).observations;

    expect(observation).toEqual({
      flag: "viewport_below_minimum",
      severity: "invalidating",
      measured: "800x700",
      threshold: "820x640",
    });
  });

  it("treats an unknown viewport as unverifiable rather than passing", () => {
    const result = resolveSectionEligibility(parsed(), "gv", {
      deviceClass: "desktop",
      viewportWidth: null,
      viewportHeight: null,
    });

    expect(result.normEligible).toBe(false);
    expect(result.observations[0]?.measured).toBe("unknown");
  });

  it("still runs the section when an observation is only advisory", () => {
    const advisory = parseQualityRuleSetDefinition(
      {
        ...definition,
        severity: {
          ...definition.severity,
          viewport_below_minimum: { default: "info", byDomain: {} },
          device_class_not_normed: { default: "info", byDomain: {} },
        },
      },
      "rules",
    );
    const result = resolveSectionEligibility(advisory, "gv", {
      deviceClass: "phone",
      viewportWidth: 375,
      viewportHeight: 667,
    });

    expect(result.normEligible).toBe(true);
    expect(result.observations).toHaveLength(2);
  });
});

const judging = {
  ...definition,
  severity: {
    ...definition.severity,
    rapid_responding: { default: "warning" },
    excessive_missingness: { default: "warning" },
    focus_loss: { default: "warning" },
    gs_trial_interrupted: {
      default: "warning",
      byDomain: { gs: "invalidating" },
    },
    too_few_responses: { default: "invalidating" },
    impossible_timing: { default: "invalidating" },
  },
  thresholds: {
    rapidRespondingMs: 2_000,
    rapidRespondingShare: 0.5,
    missingnessShare: 0.5,
    focusLossCount: 3,
    tooFewResponsesShare: 0.25,
  },
};

function emptyEvidence(
  overrides: Partial<SectionQualityEvidence> = {},
): SectionQualityEvidence {
  return {
    scoredItemCount: 8,
    attempted: 8,
    omitted: 0,
    timedOut: 0,
    notReached: 0,
    answeredResponseTimesMs: [4_000, 5_000, 6_000, 4_500],
    invalidTimingCount: 0,
    focusLossCount: 0,
    gsTrialInterrupted: false,
    ...overrides,
  };
}

describe("evaluateSectionQuality", () => {
  const open = {
    deviceNormEligible: true,
    observations: [] as QualityObservation[],
  };

  it("does not treat a low score as invalid", () => {
    const quality = evaluateSectionQuality(
      parseQualityRuleSetDefinition(judging, "rules"),
      "gf",
      open,
      emptyEvidence({ attempted: 8 }),
    );

    expect(quality.sectionValid).toBe(true);
    expect(quality.normEligible).toBe(true);
    expect(quality.observations).toEqual([]);
  });

  it("treats too few responses as a technical invalidation", () => {
    const quality = evaluateSectionQuality(
      parseQualityRuleSetDefinition(judging, "rules"),
      "gf",
      open,
      emptyEvidence({ attempted: 1, omitted: 1, notReached: 6 }),
    );

    expect(quality.sectionValid).toBe(false);
    expect(quality.normEligible).toBe(false);
    expect(quality.observations[0]?.flag).toBe("too_few_responses");
  });

  it("downgrades a single behavioral invalidation to a warning", () => {
    const quality = evaluateSectionQuality(
      parseQualityRuleSetDefinition(judging, "rules"),
      "gs",
      open,
      emptyEvidence({ gsTrialInterrupted: true }),
    );

    expect(quality.sectionValid).toBe(true);
    expect(quality.normEligible).toBe(false);
    expect(quality.observations[0]).toMatchObject({
      flag: "gs_trial_interrupted",
      severity: "warning",
    });
  });

  it("needs two independent behavioral families to mark a section uninterpretable", () => {
    const quality = evaluateSectionQuality(
      parseQualityRuleSetDefinition(judging, "rules"),
      "gs",
      open,
      emptyEvidence({
        attempted: 4,
        omitted: 4,
        gsTrialInterrupted: true,
        answeredResponseTimesMs: [],
      }),
    );

    expect(quality.sectionValid).toBe(false);
    expect(quality.normEligible).toBe(false);
    expect(quality.observations.map((row) => row.flag).sort()).toEqual([
      "excessive_missingness",
      "gs_trial_interrupted",
    ]);
  });

  it("does not count focus loss and a Gs interruption as two families", () => {
    const quality = evaluateSectionQuality(
      parseQualityRuleSetDefinition(judging, "rules"),
      "gs",
      open,
      emptyEvidence({ focusLossCount: 4, gsTrialInterrupted: true }),
    );

    expect(quality.sectionValid).toBe(true);
    expect(
      quality.observations.filter((row) => row.severity === "invalidating"),
    ).toEqual([]);
  });
});

describe("pickVisibleWarnings", () => {
  it("keeps at most two warnings and prefers invalidating ones", () => {
    const visible = pickVisibleWarnings([
      {
        domain: "gf",
        position: 1,
        observations: [
          {
            flag: "rapid_responding",
            severity: "warning",
            measured: "6/8",
            threshold: "2000ms",
          },
        ],
      },
      {
        domain: "gv",
        position: 2,
        observations: [
          {
            flag: "device_class_not_normed",
            severity: "invalidating",
            measured: "phone",
            threshold: "phone",
          },
          {
            flag: "focus_loss",
            severity: "warning",
            measured: "4",
            threshold: "3",
          },
        ],
      },
    ]);

    expect(visible).toHaveLength(2);
    expect(visible[0]?.flag).toBe("device_class_not_normed");
    expect(visible[1]?.flag).toBe("rapid_responding");
  });
});
