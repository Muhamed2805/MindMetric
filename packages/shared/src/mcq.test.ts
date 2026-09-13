import { describe, expect, it } from "vitest";
import {
  isMcqTimedDefinition,
  MCQ_TIMED_ENGINE,
  normalizeMcqAnswer,
} from "./mcq";

const item = {
  id: "q1",
  type: "mcq" as const,
  prompt: "Next?",
  choices: [
    { id: "c1", label: "A" },
    { id: "c2", label: "B" },
  ],
  correctChoiceId: "c2",
  timeLimitMs: 2000,
};

describe("isMcqTimedDefinition", () => {
  it("requires a key that exists on the choices", () => {
    expect(
      isMcqTimedDefinition({
        engine: MCQ_TIMED_ENGINE,
        items: [item],
      }),
    ).toBe(true);
    expect(
      isMcqTimedDefinition({
        engine: MCQ_TIMED_ENGINE,
        items: [{ ...item, correctChoiceId: "missing" }],
      }),
    ).toBe(false);
  });
});

describe("normalizeMcqAnswer", () => {
  it("flags elapsed time past the limit as a timeout", () => {
    const normalized = normalizeMcqAnswer(item, {
      choiceId: "c2",
      elapsedMs: 4000,
      timedOut: false,
    });
    expect(normalized?.timedOut).toBe(true);
  });
});
