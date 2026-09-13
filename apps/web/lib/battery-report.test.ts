import { describe, expect, it } from "vitest";
import { batteryRawLabel, sectionNotes } from "../components/battery-report";
import type { BatteryReport } from "./battery-types";

const report: BatteryReport = {
  maturity: "S0",
  durationMs: 1000,
  composite: null,
  estimatedIq: null,
  percentile: null,
  interval: null,
  sections: [
    {
      domain: "gf",
      position: 1,
      status: "submitted",
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
      "Taken on a phone; that device class is not in the reference sample.",
      "Kept out of the reference sample.",
    ]);
  });

  it("hides info-only flags", () => {
    const gf = report.sections[0];
    expect(sectionNotes(gf as NonNullable<typeof gf>)).toEqual([]);
  });
});
