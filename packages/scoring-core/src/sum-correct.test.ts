import { MCQ_TIMED_ENGINE } from "@mindmetric/shared";
import { describe, expect, it } from "vitest";
import { scoreMcqTimed } from "./sum-correct";

const definition = {
  engine: MCQ_TIMED_ENGINE,
  items: [
    {
      id: "a",
      type: "mcq" as const,
      prompt: "2, 4, 8, ?",
      choices: [
        { id: "a1", label: "10" },
        { id: "a2", label: "16" },
      ],
      correctChoiceId: "a2",
      timeLimitMs: 5000,
    },
    {
      id: "b",
      type: "mcq" as const,
      prompt: "Odd one out",
      choices: [
        { id: "b1", label: "oak" },
        { id: "b2", label: "rose" },
      ],
      correctChoiceId: "b2",
      timeLimitMs: 5000,
    },
  ],
  scoring: {
    model: "sum-correct-v1" as const,
    bands: [
      { upTo: 1, id: "low", label: "Low" },
      { upTo: 2, id: "high", label: "High" },
    ],
    norms: {
      kind: "development" as const,
      points: [
        { score: 0, percentile: 10 },
        { score: 2, percentile: 90 },
      ],
    },
  },
};

describe("scoreMcqTimed", () => {
  it("awards a point only for in-time correct choices", () => {
    const score = scoreMcqTimed(definition, {
      a: { choiceId: "a2", elapsedMs: 800, timedOut: false },
      b: { choiceId: "b1", elapsedMs: 900, timedOut: false },
    });
    expect(score.raw).toBe(1);
    expect(score.max).toBe(2);
    expect(score.items[0]?.correct).toBe(true);
    expect(score.items[1]?.correct).toBe(false);
  });

  it("scores a timeout as incorrect even with the right choice", () => {
    const score = scoreMcqTimed(definition, {
      a: { choiceId: "a2", elapsedMs: 8000, timedOut: false },
      b: { choiceId: "b2", elapsedMs: 400, timedOut: false },
    });
    expect(score.items[0]?.timedOut).toBe(true);
    expect(score.items[0]?.correct).toBe(false);
    expect(score.raw).toBe(1);
  });
});
