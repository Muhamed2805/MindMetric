import type { SpeedTrialContent } from "@mindmetric/shared";
import { describe, expect, it } from "vitest";
import { scoreSpeedCorrected, scoreSpeedTrial } from "./speed-corrected";

const figure = {
  kind: "grid" as const,
  rows: 1,
  cols: 1,
  cells: [
    {
      row: 1,
      col: 1,
      blank: false,
      elements: [
        {
          shape: "circle" as const,
          fill: "solid" as const,
          rotation: 0 as const,
          size: 2 as const,
          count: 1,
        },
      ],
    },
  ],
};

const content: SpeedTrialContent = {
  engine: "speed-trial-v1",
  domain: "gs",
  prompt: "Same or different?",
  k: 2,
  decisions: [
    { id: "a", left: figure, right: figure, same: true },
    { id: "b", left: figure, right: figure, same: true },
    { id: "c", left: figure, right: figure, same: true },
    { id: "d", left: figure, right: figure, same: true },
  ],
};

function answered(id: string, choiceId: string) {
  return { decisionId: id, code: "answered" as const, choiceId };
}

describe("scoreSpeedTrial", () => {
  it("is zero in expectation when every answer is a coin flip of k=2", () => {
    // Two correct, two wrong: C − E/(2−1) = 2 − 2 = 0.
    const score = scoreSpeedTrial({
      itemRevisionId: "t1",
      content,
      decisions: [
        answered("a", "same"),
        answered("b", "same"),
        answered("c", "different"),
        answered("d", "different"),
      ],
    });
    expect(score.signedRaw).toBe(0);
    expect(score.displayRaw).toBe(0);
    expect(score.correct).toBe(2);
    expect(score.incorrect).toBe(2);
  });

  it("stores a negative signed value and displays zero", () => {
    const score = scoreSpeedTrial({
      itemRevisionId: "t1",
      content,
      decisions: [
        answered("a", "different"),
        answered("b", "different"),
        answered("c", "different"),
        answered("d", "same"),
      ],
    });
    expect(score.signedRaw).toBe(-2);
    expect(score.displayRaw).toBe(0);
  });

  it("does not treat omissions as errors", () => {
    const score = scoreSpeedTrial({
      itemRevisionId: "t1",
      content,
      decisions: [
        answered("a", "same"),
        { decisionId: "b", code: "omitted", choiceId: null },
        { decisionId: "c", code: "not_reached", choiceId: null },
        { decisionId: "d", code: "timed_out", choiceId: null },
      ],
    });
    expect(score.correct).toBe(1);
    expect(score.incorrect).toBe(0);
    expect(score.signedRaw).toBe(1);
    expect(score.omitted).toBe(1);
    expect(score.notReached).toBe(1);
    expect(score.timedOut).toBe(1);
  });
});

describe("scoreSpeedCorrected", () => {
  it("reports trials separately and never invents an index", () => {
    const score = scoreSpeedCorrected([
      {
        itemRevisionId: "t1",
        content,
        decisions: [answered("a", "same")],
      },
    ]);
    expect(score.domain).toBe("gs");
    expect(score.trials).toHaveLength(1);
    expect(score).not.toHaveProperty("index");
    expect(score).not.toHaveProperty("composite");
  });
});
