import { describe, expect, it } from "vitest";
import { batteryRawLabel } from "../components/battery-report";
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
    },
  ],
};

describe("batteryRawLabel", () => {
  it("joins section totals without inventing a composite", () => {
    expect(batteryRawLabel(report)).toBe("3/7 · 1/2");
    expect(batteryRawLabel(null)).toBe("Raw totals");
  });
});
