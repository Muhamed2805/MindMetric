import { LIKERT_ENGINE, type LikertItem } from "@mindmetric/shared";
import { describe, expect, it } from "vitest";
import { interpolatePercentile, keyedLikertScore, scoreLikertCtt } from "./ctt";

const scale = {
  min: 1,
  max: 5,
  anchors: [
    { value: 1, label: "Low" },
    { value: 5, label: "High" },
  ],
};

const forward: LikertItem = {
  id: "a",
  type: "likert",
  prompt: "Forward",
  scale,
};

const reverse: LikertItem = {
  id: "b",
  type: "likert",
  prompt: "Reverse",
  reverse: true,
  scale,
};

describe("keyedLikertScore", () => {
  it("leaves forward items unchanged", () => {
    expect(keyedLikertScore(forward, 2)).toBe(2);
  });

  it("mirrors reverse items on the scale", () => {
    expect(keyedLikertScore(reverse, 2)).toBe(4);
  });
});

describe("interpolatePercentile", () => {
  it("linearly interpolates between tabulated scores", () => {
    const points = [
      { score: 10, percentile: 20 },
      { score: 20, percentile: 40 },
    ];
    expect(interpolatePercentile(15, points)).toBe(30);
  });
});

describe("scoreLikertCtt", () => {
  it("sums keyed scores and reports pomp", () => {
    const result = scoreLikertCtt(
      {
        engine: LIKERT_ENGINE,
        items: [forward, reverse],
        scoring: {
          model: "ctt-v1",
          bands: [
            { upTo: 5, id: "low", label: "Low" },
            { upTo: 10, id: "high", label: "High" },
          ],
          norms: {
            kind: "development",
            points: [
              { score: 2, percentile: 1 },
              { score: 10, percentile: 99 },
            ],
          },
        },
      },
      { a: 4, b: 2 },
    );

    expect(result.raw).toBe(8);
    expect(result.min).toBe(2);
    expect(result.max).toBe(10);
    expect(result.pomp).toBe(75);
    expect(result.band?.id).toBe("high");
    expect(result.items.map((item) => item.keyed)).toEqual([4, 4]);
    expect(result.facets).toBeUndefined();
  });

  it("scores named facets without changing the overall total", () => {
    const result = scoreLikertCtt(
      {
        engine: LIKERT_ENGINE,
        items: [
          { ...forward, facet: "openness" },
          { ...reverse, facet: "stability" },
        ],
        scoring: {
          model: "ctt-v1",
          bands: [
            { upTo: 5, id: "low", label: "Low" },
            { upTo: 10, id: "high", label: "High" },
          ],
          norms: {
            kind: "development",
            points: [
              { score: 2, percentile: 1 },
              { score: 10, percentile: 99 },
            ],
          },
          facets: [
            {
              id: "openness",
              label: "Openness",
              bands: [{ upTo: 5, id: "higher", label: "Higher" }],
            },
            {
              id: "stability",
              label: "Emotional stability",
              bands: [{ upTo: 5, id: "higher", label: "Higher" }],
            },
          ],
        },
      },
      { a: 4, b: 2 },
    );

    expect(result.raw).toBe(8);
    expect(result.facets).toEqual([
      {
        id: "openness",
        label: "Openness",
        raw: 4,
        min: 1,
        max: 5,
        pomp: 75,
        band: { id: "higher", label: "Higher" },
      },
      {
        id: "stability",
        label: "Emotional stability",
        raw: 4,
        min: 1,
        max: 5,
        pomp: 75,
        band: { id: "higher", label: "Higher" },
      },
    ]);
  });

  it("rejects a missing answer", () => {
    expect(() =>
      scoreLikertCtt({ engine: LIKERT_ENGINE, items: [forward] }, {}),
    ).toThrow(/a/);
  });
});
