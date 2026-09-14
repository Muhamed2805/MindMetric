import { describe, expect, it } from "vitest";
import { personalityBandCopy, personalityPoles } from "./personality";

describe("personalityBandCopy", () => {
  it("returns original copy for a known facet and band", () => {
    expect(personalityBandCopy("openness", "higher")).toMatch(/new way/);
    expect(personalityBandCopy("stability", "lower")).toMatch(/mistake/);
  });

  it("returns null for an unknown pair", () => {
    expect(personalityBandCopy("openness", "missing")).toBeNull();
    expect(personalityBandCopy("unknown", "typical")).toBeNull();
  });
});

describe("personalityPoles", () => {
  it("names both ends of each published trait", () => {
    expect(personalityPoles("extraversion")).toEqual({
      low: "Quiet",
      high: "Outgoing",
    });
    expect(personalityPoles("missing")).toBeNull();
  });
});
