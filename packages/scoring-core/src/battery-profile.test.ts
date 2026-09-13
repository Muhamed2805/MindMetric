import { describe, expect, it } from "vitest";
import { scoreAccuracyPower } from "./accuracy-power";
import {
  batteryProfileInputCanon,
  powerSectionInputCanon,
  scoreBatteryProfile,
  toBatterySectionReport,
} from "./battery-profile";

describe("scoreBatteryProfile", () => {
  it("keeps IQ, percentile, and the composite as null", () => {
    const report = scoreBatteryProfile({
      durationMs: 120_000,
      sections: [
        {
          domain: "gf",
          position: 1,
          scoringModel: "accuracy-power-v1",
          status: "submitted",
          normEligible: true,
          raw: 4,
          max: 7,
          attempted: 7,
          accuracyOnAttempted: 57.1,
        },
      ],
    });

    expect(report.maturity).toBe("S0");
    expect(report.estimatedIq).toBeNull();
    expect(report.percentile).toBeNull();
    expect(report.interval).toBeNull();
    expect(report.composite).toBeNull();
    expect(report.sections[0]?.raw).toBe(4);
    expect(report.sections[0]?.max).toBe(7);
  });

  it("orders sections by the composition, not the order they were scored", () => {
    const report = scoreBatteryProfile({
      durationMs: null,
      sections: [
        {
          domain: "gv",
          position: 2,
          scoringModel: "accuracy-power-v1",
          status: "expired",
          normEligible: false,
          raw: 1,
          max: 2,
          attempted: 1,
          accuracyOnAttempted: 100,
        },
        {
          domain: "gf",
          position: 1,
          scoringModel: "accuracy-power-v1",
          status: "submitted",
          normEligible: true,
          raw: 0,
          max: 3,
          attempted: 3,
          accuracyOnAttempted: 0,
        },
      ],
    });

    expect(report.sections.map((section) => section.domain)).toEqual([
      "gf",
      "gv",
    ]);
  });

  it("copies raw totals from the section model and drops item keys", () => {
    const score = scoreAccuracyPower("gf", [
      {
        itemRevisionId: "one",
        content: {
          engine: "power-mcq-v1",
          domain: "gf",
          prompt: null,
          stimulus: { type: "text", text: "x" },
          choices: [
            { id: "a", content: { type: "text", text: "a" } },
            { id: "b", content: { type: "text", text: "b" } },
          ],
          correctChoiceId: "a",
          difficulty: "easy",
          anchor: false,
        },
        code: "answered",
        choiceId: "a",
        responseTimeMs: 1000,
      },
    ]);

    const report = toBatterySectionReport(
      {
        domain: "gf",
        position: 1,
        status: "submitted",
        normEligible: true,
      },
      score,
    );

    expect(report.raw).toBe(1);
    expect(report.max).toBe(1);
    expect(report).not.toHaveProperty("items");
    expect(report).not.toHaveProperty("correctChoiceId");
  });
});

describe("input canons", () => {
  it("is stable under record order", () => {
    const first = powerSectionInputCanon([
      { itemRevisionId: "b", code: "answered", choiceId: "a" },
      { itemRevisionId: "a", code: "omitted", choiceId: null },
    ]);
    const second = powerSectionInputCanon([
      { itemRevisionId: "a", code: "omitted", choiceId: null },
      { itemRevisionId: "b", code: "answered", choiceId: "a" },
    ]);
    expect(first).toBe(second);
  });

  it("changes when an answer changes", () => {
    const left = powerSectionInputCanon([
      { itemRevisionId: "a", code: "answered", choiceId: "a" },
    ]);
    const right = powerSectionInputCanon([
      { itemRevisionId: "a", code: "answered", choiceId: "b" },
    ]);
    expect(left).not.toBe(right);
  });

  it("is stable under section digest order", () => {
    expect(batteryProfileInputCanon(["z", "a"])).toBe(
      batteryProfileInputCanon(["a", "z"]),
    );
  });
});
