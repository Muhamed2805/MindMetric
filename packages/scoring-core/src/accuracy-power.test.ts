import type { DifficultyTier, PowerMcqItemContent } from "@mindmetric/shared";
import { describe, expect, it } from "vitest";
import { type PowerItemRecord, scoreAccuracyPower } from "./accuracy-power";

function content(
  difficulty: DifficultyTier,
  anchor = false,
): PowerMcqItemContent {
  return {
    engine: "power-mcq-v1",
    domain: "gf",
    prompt: null,
    stimulus: { type: "text", text: "1, 2, 3, ?" },
    choices: [
      { id: "a", content: { type: "text", text: "4" } },
      { id: "b", content: { type: "text", text: "5" } },
    ],
    correctChoiceId: "a",
    difficulty,
    anchor,
  };
}

function record(
  id: string,
  code: PowerItemRecord["code"],
  choiceId: string | null,
  responseTimeMs: number | null = null,
  difficulty: DifficultyTier = "easy",
  anchor = false,
): PowerItemRecord {
  return {
    itemRevisionId: id,
    content: content(difficulty, anchor),
    code,
    choiceId,
    responseTimeMs,
  };
}

describe("scoreAccuracyPower", () => {
  it("derives correctness from the key rather than a stored flag", () => {
    const score = scoreAccuracyPower("gf", [
      record("one", "answered", "a"),
      record("two", "answered", "b"),
    ]);

    expect(score.raw).toBe(1);
    expect(score.correct).toBe(1);
    expect(score.incorrect).toBe(1);
    expect(score.items[0]?.outcome).toBe("correct");
    expect(score.items[1]?.outcome).toBe("incorrect");
  });

  it("counts omit and timeout as attempted but not not-reached", () => {
    const score = scoreAccuracyPower("gf", [
      record("one", "answered", "a"),
      record("two", "omitted", null),
      record("three", "timed_out", null),
      record("four", "not_reached", null),
    ]);

    expect(score.max).toBe(4);
    expect(score.attempted).toBe(3);
    expect(score.notReached).toBe(1);
    expect(score.accuracyOnAttempted).toBeCloseTo(33.3, 1);
  });

  it("drops technically invalid items out of the denominator", () => {
    const score = scoreAccuracyPower("gf", [
      record("one", "answered", "a"),
      record("two", "invalid", null),
    ]);

    expect(score.max).toBe(1);
    expect(score.attempted).toBe(1);
    expect(score.invalid).toBe(1);
    expect(score.accuracyOnAttempted).toBe(100);
  });

  it("keeps post-deadline answers in the maximum but out of attempted", () => {
    const score = scoreAccuracyPower("gf", [
      record("one", "answered", "a"),
      record("two", "post_deadline", "a"),
    ]);

    expect(score.max).toBe(2);
    expect(score.attempted).toBe(1);
    expect(score.postDeadline).toBe(1);
  });

  it("reports no accuracy when nothing was attempted", () => {
    const score = scoreAccuracyPower("gf", [
      record("one", "not_reached", null),
    ]);

    expect(score.accuracyOnAttempted).toBeNull();
    expect(score.medianResponseTimeMs).toBeNull();
  });

  it("breaks performance down by intended difficulty", () => {
    const score = scoreAccuracyPower("gf", [
      record("one", "answered", "a", 4000, "easy"),
      record("two", "answered", "b", 5000, "hard"),
      record("three", "not_reached", null, null, "hard"),
    ]);

    const hard = score.difficulty.find((entry) => entry.tier === "hard");
    expect(hard).toEqual({
      tier: "hard",
      inForm: 2,
      administered: 1,
      correct: 0,
    });
    expect(score.medianResponseTimeMs).toBe(4500);
  });

  it("counts anchor failures only among administered anchors", () => {
    const score = scoreAccuracyPower("gf", [
      record("one", "answered", "b", 3000, "easy", true),
      record("two", "not_reached", null, null, "easy", true),
    ]);

    expect(score.anchorsAdministered).toBe(1);
    expect(score.anchorsFailed).toBe(1);
  });

  it("never emits a percentile, band, or composite", () => {
    const score = scoreAccuracyPower("gf", [record("one", "answered", "a")]);

    expect(score).not.toHaveProperty("percentile");
    expect(score).not.toHaveProperty("band");
    expect(score).not.toHaveProperty("composite");
  });

  it("refuses items from another domain", () => {
    expect(() =>
      scoreAccuracyPower("gv", [record("one", "answered", "a")]),
    ).toThrow(/measures gf, not gv/);
  });
});
