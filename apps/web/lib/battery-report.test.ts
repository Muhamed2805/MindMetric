import { describe, expect, it } from "vitest";
import {
  batteryRawLabel,
  reportWarningNotes,
  sectionNotes,
} from "../components/battery-report";
import type { BatteryReport } from "./battery-types";

const report: BatteryReport = {
  maturity: "S0",
  durationMs: 1000,
  composite: null,
  estimatedIq: null,
  percentile: null,
  interval: null,
  sessionValid: true,
  normEligible: false,
  warnings: [
    {
      flag: "device_class_not_normed",
      severity: "invalidating",
      measured: "phone",
      threshold: "phone,unknown",
      domain: "gv",
      position: 2,
    },
  ],
  sections: [
    {
      domain: "gf",
      position: 1,
      status: "submitted",
      sectionScored: true,
      sectionValid: true,
      normEligible: true,
      raw: 3,
      max: 7,
      attempted: 7,
      accuracyOnAttempted: 42.9,
      omitted: 0,
      timedOut: 0,
      notReached: 0,
      observations: [],
    },
    {
      domain: "gv",
      position: 2,
      status: "expired",
      sectionScored: true,
      sectionValid: true,
      normEligible: false,
      raw: 1,
      max: 2,
      attempted: 1,
      accuracyOnAttempted: 100,
      omitted: 0,
      timedOut: 1,
      notReached: 1,
      observations: [
        {
          flag: "device_class_not_normed",
          severity: "invalidating",
          measured: "phone",
          threshold: "phone,unknown",
        },
      ],
    },
  ],
};

describe("batteryRawLabel", () => {
  it("joins section totals without inventing a composite", () => {
    expect(batteryRawLabel(report)).toBe("3/7 · 1/2");
    expect(batteryRawLabel(null)).toBe("Raw totals");
  });
});

describe("sectionNotes", () => {
  it("explains expiry, unreached items, and why a section is out of sample", () => {
    const gv = report.sections[1];
    expect(gv).toBeTruthy();
    expect(sectionNotes(gv as NonNullable<typeof gv>)).toEqual([
      "The section clock ran out.",
      "1 item was never shown.",
      "1 item timed out after it was shown.",
      "Kept out of the reference sample.",
    ]);
  });

  it("says when a section could not be scored reliably", () => {
    expect(
      sectionNotes({
        ...report.sections[0],
        sectionValid: false,
        normEligible: false,
      } as NonNullable<(typeof report.sections)[0]>),
    ).toContain("This section could not be scored reliably.");
  });

  it("keeps completion notes off a clean section", () => {
    const gf = report.sections[0];
    expect(sectionNotes(gf as NonNullable<typeof gf>)).toEqual([]);
  });
});

describe("reportWarningNotes", () => {
  it("keeps at most the report-level warnings and names the domain", () => {
    expect(reportWarningNotes(report)).toEqual([
      "Spatial reasoning: Taken on a phone; that device class is not in the reference sample.",
    ]);
  });
});
