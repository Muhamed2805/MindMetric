import { describe, expect, it } from "vitest";
import { FIVE_FACTOR_SLUG } from "./personality";
import { scaleResultNote } from "./result-copy";

describe("scaleResultNote", () => {
  it("uses the band, not a development percentile", () => {
    const score = {
      percentile: 72,
      band: { label: "Steady focus" },
    };
    expect(scaleResultNote({ slug: "work-attention", score })).toBe(
      "Steady focus",
    );
  });

  it("falls back to keyed total when there is no band", () => {
    const score = { percentile: 70, band: null };
    expect(scaleResultNote({ slug: "quick-pattern-reasoning", score })).toBe(
      "Keyed total",
    );
  });

  it("keeps the five-factor list copy", () => {
    expect(
      scaleResultNote({
        slug: FIVE_FACTOR_SLUG,
        score: { facets: [{ id: "openness" }] },
      }),
    ).toBe("Self-report profile");
  });
});
