import { describe, expect, it } from "vitest";
import { type SpanTrialRecord, scoreSpanPartial } from "./span-partial";

function trial(
  id: string,
  sequence: string[],
  recalled: string[] | null,
  code: SpanTrialRecord["code"] = "answered",
): SpanTrialRecord {
  return {
    itemRevisionId: id,
    length: sequence.length,
    recall: "reverse",
    sequence,
    recalled,
    code,
  };
}

describe("scoreSpanPartial", () => {
  it("credits exact serial positions on the reverse of the shown sequence", () => {
    const score = scoreSpanPartial([
      {
        id: "spatial-reverse-v1",
        trials: [
          trial("a", ["r1c1", "r1c2", "r1c3"], ["r1c3", "r1c2", "r1c1"]),
        ],
      },
    ]);

    expect(score.raw).toBe(3);
    expect(score.max).toBe(3);
    expect(score.procedures[0]?.absoluteSpan).toBe(3);
    expect(score.procedures[0]?.sequencesFullyCorrect).toBe(1);
  });

  it("gives partial credit when only some positions match", () => {
    const score = scoreSpanPartial([
      {
        id: "spatial-reverse-v1",
        trials: [
          trial("a", ["r1c1", "r1c2", "r1c3"], ["r1c3", "r2c2", "r1c1"]),
        ],
      },
    ]);

    expect(score.raw).toBe(2);
    expect(score.procedures[0]?.trials[0]?.fullyCorrect).toBe(false);
    expect(score.procedures[0]?.absoluteSpan).toBe(0);
  });

  it("zeroes the rest of the ladder after two consecutive empty trials", () => {
    const score = scoreSpanPartial([
      {
        id: "spatial-reverse-v1",
        trials: [
          trial("a", ["r1c1", "r1c2", "r1c3"], ["r2c2", "r2c2", "r2c2"]),
          trial("b", ["r1c1", "r1c2", "r1c3"], null, "omitted"),
          trial(
            "c",
            ["r1c1", "r1c2", "r1c3", "r2c1"],
            ["r2c1", "r1c3", "r1c2", "r1c1"],
          ),
        ],
      },
    ]);

    expect(score.raw).toBe(0);
    expect(score.max).toBe(10);
    expect(score.procedures[0]?.trials[2]?.discontinued).toBe(true);
    expect(score.procedures[0]?.trials[2]?.raw).toBe(0);
  });

  it("drops an invalid trial from the maximum", () => {
    const score = scoreSpanPartial([
      {
        id: "spatial-reverse-v1",
        trials: [
          trial("a", ["r1c1", "r1c2", "r1c3"], ["r1c3", "r1c2", "r1c1"]),
          trial("b", ["r1c1", "r1c2", "r1c3"], null, "invalid"),
        ],
      },
    ]);

    expect(score.raw).toBe(3);
    expect(score.max).toBe(3);
    expect(score.invalid).toBe(1);
  });

  it("weights two procedures as equal proportions of their own maxima", () => {
    const score = scoreSpanPartial([
      {
        id: "spatial-reverse-v1",
        trials: [
          trial("a", ["r1c1", "r1c2", "r1c3"], ["r1c3", "r1c2", "r1c1"]),
        ],
      },
      {
        id: "symbol-update-v1",
        trials: [trial("b", ["r1c1", "r1c2"], ["r1c2", "r2c2"])],
      },
    ]);

    expect(score.raw).toBe(4);
    expect(score.max).toBe(5);
    expect(score.combinedProportion).toBe(0.75);
  });
});
