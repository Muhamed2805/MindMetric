import { describe, expect, it } from "vitest";
import {
  buildItemPresentation,
  classifyResponse,
  parseItemPresentation,
  SUBMISSION_GRACE_MS,
  shuffleForPresentation,
} from "./battery-session";
import { parsePowerMcqItemContent } from "./power-mcq";

const shownAt = new Date("2026-09-13T12:00:00.000Z");
const deadlineAt = new Date("2026-09-13T12:05:00.000Z");
const CEILING = 90_000;

function at(offsetMs: number) {
  return new Date(shownAt.getTime() + offsetMs);
}

function classify(offsetMs: number, choiceId: string | null = "b") {
  return classifyResponse({
    choiceId,
    shownAt,
    deadlineAt,
    itemCeilingMs: CEILING,
    receivedAt: at(offsetMs),
  });
}

describe("classifyResponse", () => {
  it("records an answer inside both clocks", () => {
    expect(classify(4_000)).toEqual({
      code: "answered",
      responseTimeMs: 4_000,
    });
  });

  it("separates a deliberate skip from a late answer", () => {
    expect(classify(4_000, null).code).toBe("omitted");
    expect(classify(CEILING + 10_000).code).toBe("timed_out");
  });

  it("closes the item at the ceiling but allows for network transit", () => {
    expect(classify(CEILING + SUBMISSION_GRACE_MS).code).toBe("answered");
    expect(classify(CEILING + SUBMISSION_GRACE_MS + 1).code).toBe("timed_out");
  });

  it("takes the section deadline over the item ceiling", () => {
    const result = classifyResponse({
      choiceId: "b",
      shownAt: new Date(deadlineAt.getTime() - 5_000),
      deadlineAt,
      itemCeilingMs: CEILING,
      receivedAt: new Date(deadlineAt.getTime() + SUBMISSION_GRACE_MS + 1),
    });

    expect(result.code).toBe("post_deadline");
  });

  it("keeps the measured time on a discarded submission", () => {
    expect(classify(CEILING + 10_000).responseTimeMs).toBe(CEILING + 10_000);
  });

  it("cannot time an item that was never presented", () => {
    expect(
      classifyResponse({
        choiceId: "b",
        shownAt: null,
        deadlineAt,
        itemCeilingMs: CEILING,
        receivedAt: at(1_000),
      }),
    ).toEqual({ code: "invalid", responseTimeMs: null });
  });

  it("treats impossible timing as a fault rather than a fast answer", () => {
    expect(classify(-1).code).toBe("invalid");
  });
});

describe("parseItemPresentation", () => {
  it("rejects a repeated option", () => {
    expect(() =>
      parseItemPresentation({ choiceOrder: ["a", "a"] }, "presentation"),
    ).toThrow(/repeats a/);
  });

  it("rejects an empty order", () => {
    expect(() =>
      parseItemPresentation({ choiceOrder: [] }, "presentation"),
    ).toThrow(/missing choiceOrder/);
  });
});

describe("shuffleForPresentation", () => {
  it("keeps every option exactly once", () => {
    const ids = ["a", "b", "c", "d", "e", "f"];
    const shuffled = shuffleForPresentation(ids, Math.random);

    expect([...shuffled].sort()).toEqual([...ids].sort());
  });

  it("does not mutate the input", () => {
    const ids = ["a", "b", "c"];
    shuffleForPresentation(ids, () => 0);

    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("spreads the key across positions instead of anchoring it", () => {
    const content = parsePowerMcqItemContent(
      {
        engine: "power-mcq-v1",
        domain: "gf",
        difficulty: "easy",
        stimulus: {
          type: "figure",
          figure: { kind: "single", elements: [{ shape: "circle" }] },
        },
        correctChoiceId: "c",
        choices: ["a", "b", "c", "d"].map((id, index) => ({
          id,
          content: {
            type: "figure",
            figure: {
              kind: "single",
              elements: [{ shape: "circle", count: index + 1 }],
            },
          },
        })),
      },
      "item",
    );

    const counts = [0, 0, 0, 0];
    for (let run = 0; run < 2_000; run += 1) {
      const { choiceOrder } = buildItemPresentation(content, Math.random);
      const position = choiceOrder.indexOf("c");
      counts[position] = (counts[position] ?? 0) + 1;
    }

    for (const count of counts) {
      expect(count).toBeGreaterThan(350);
    }
  });
});
