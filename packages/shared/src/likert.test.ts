import { describe, expect, it } from "vitest";
import {
  allItemsAnswered,
  isLikertDefinition,
  isLikertValue,
  LIKERT_ENGINE,
} from "./likert";

const scale = {
  min: 1,
  max: 5,
  anchors: [
    { value: 1, label: "Strongly disagree" },
    { value: 5, label: "Strongly agree" },
  ],
};

describe("isLikertDefinition", () => {
  it("accepts a valid definition", () => {
    expect(
      isLikertDefinition({
        engine: LIKERT_ENGINE,
        items: [
          {
            id: "q1",
            type: "likert",
            prompt: "I finish work I start.",
            scale,
          },
        ],
      }),
    ).toBe(true);
  });

  it("rejects an empty item list", () => {
    expect(isLikertDefinition({ engine: LIKERT_ENGINE, items: [] })).toBe(
      false,
    );
  });
});

describe("isLikertValue", () => {
  it("requires an integer inside the scale", () => {
    const item = { scale };
    expect(isLikertValue(item, 3)).toBe(true);
    expect(isLikertValue(item, 0)).toBe(false);
    expect(isLikertValue(item, 3.5)).toBe(false);
  });
});

describe("allItemsAnswered", () => {
  it("is true only when every item has an answer", () => {
    expect(allItemsAnswered(["a", "b"], ["a"])).toBe(false);
    expect(allItemsAnswered(["a", "b"], ["b", "a"])).toBe(true);
  });
});
