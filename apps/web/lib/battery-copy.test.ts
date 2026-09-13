import { describe, expect, it } from "vitest";
import {
  batteryPhaseLabel,
  batteryRetestNote,
  batteryScoreDisclaimer,
} from "./battery-copy";

describe("battery copy", () => {
  it("never mentions an IQ as a number you will receive", () => {
    expect(batteryScoreDisclaimer()).toMatch(/not an IQ/);
    expect(batteryScoreDisclaimer()).toMatch(/scored again/);
  });

  it("labels practice as calibration, not a finished instrument", () => {
    expect(batteryPhaseLabel(true)).toBe("Calibration practice");
    expect(batteryPhaseLabel(false)).toBe("Calibration report");
  });

  it("explains the retest lock only on a counting attempt", () => {
    expect(batteryRetestNote(false, { requiresAlternateForm: true })).toMatch(
      /alternate form/,
    );
    expect(batteryRetestNote(true, { requiresAlternateForm: true })).toMatch(
      /practice/,
    );
  });
});
