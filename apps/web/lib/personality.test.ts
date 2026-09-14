import { describe, expect, it } from "vitest";
import {
  hasPersonalityFacets,
  PERSONALITY_TRAITS,
  personalityBandCopy,
  personalityFacetPercent,
  personalityPoles,
  pickLatestPersonality,
} from "./personality";

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

  it("keeps intro cards on the same poles as the report", () => {
    expect(PERSONALITY_TRAITS.map((trait) => trait.id)).toEqual([
      "openness",
      "conscientiousness",
      "extraversion",
      "agreeableness",
      "stability",
    ]);
    expect(PERSONALITY_TRAITS[0]?.poles).toEqual(personalityPoles("openness"));
  });
});

describe("hasPersonalityFacets", () => {
  it("treats an empty facet list as a total-only score", () => {
    expect(hasPersonalityFacets({ facets: [] })).toBe(false);
    expect(
      hasPersonalityFacets({
        facets: [
          {
            id: "openness",
          },
        ],
      }),
    ).toBe(true);
  });
});

describe("pickLatestPersonality", () => {
  it("prefers a faceted report over an older total-only score", () => {
    const picked = pickLatestPersonality([
      {
        id: "old",
        slug: "five-factor-profile",
        status: "completed",
        completedAt: "2026-09-14T12:00:00.000Z",
        score: { facets: [] },
      },
      {
        id: "new",
        slug: "five-factor-profile",
        status: "completed",
        completedAt: "2026-09-14T11:00:00.000Z",
        score: {
          facets: [
            {
              id: "openness",
              label: "Openness",
              raw: 15,
              min: 5,
              max: 25,
              pomp: 50,
              band: { id: "typical", label: "Typical" },
            },
          ],
        },
      },
    ]);
    expect(picked?.id).toBe("new");
  });

  it("uses the newest faceted report when both have traits", () => {
    const picked = pickLatestPersonality([
      {
        id: "earlier",
        slug: "five-factor-profile",
        status: "completed",
        completedAt: "2026-09-14T10:00:00.000Z",
        score: {
          facets: [
            {
              id: "openness",
              label: "Openness",
              raw: 12,
              min: 5,
              max: 25,
              pomp: 35,
              band: null,
            },
          ],
        },
      },
      {
        id: "later",
        slug: "five-factor-profile",
        status: "completed",
        completedAt: "2026-09-14T12:00:00.000Z",
        score: {
          facets: [
            {
              id: "openness",
              label: "Openness",
              raw: 18,
              min: 5,
              max: 25,
              pomp: 65,
              band: null,
            },
          ],
        },
      },
    ]);
    expect(picked?.id).toBe("later");
  });
});

describe("personalityFacetPercent", () => {
  it("maps a keyed facet onto the scale range", () => {
    expect(personalityFacetPercent({ raw: 15, min: 5, max: 25 })).toBe(50);
  });
});
