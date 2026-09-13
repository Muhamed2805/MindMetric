import { describe, expect, it } from "vitest";
import {
  parseQualityRuleSetDefinition,
  type QualityRuleSetDefinition,
  resolveSectionEligibility,
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

  it("requires a severity mapping for every flag", () => {
    expect(() =>
      parseQualityRuleSetDefinition(
        {
          ...definition,
          severity: { viewport_below_minimum: { default: "info" } },
        },
        "rules",
      ),
    ).toThrow(/no severity mapping for device_class_not_normed/);
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
