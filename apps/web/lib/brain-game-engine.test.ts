import { describe, expect, it } from "vitest";
import {
  CHIMP_CELLS,
  extendSequence,
  judgeChimpClick,
  judgeNumberInput,
  judgeSequenceClick,
  judgeVerbalMark,
  judgeVisualClick,
  nextVerbalWord,
  pickVisualPattern,
  placeChimp,
  randomDigits,
  visualLevelSpec,
} from "./brain-game-engine";

function cycle(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length] ?? 0;
    index += 1;
    return value;
  };
}

describe("sequence memory", () => {
  it("appends a cell and judges a round", () => {
    const sequence = extendSequence([], 9, () => 0.5);
    expect(sequence).toEqual([4]);
    expect(judgeSequenceClick(sequence, 0, 4)).toBe("complete");
    expect(judgeSequenceClick(sequence, 0, 3)).toBe("fail");
  });

  it("asks for the rest of a longer chain", () => {
    expect(judgeSequenceClick([1, 8, 3], 0, 1)).toBe("continue");
    expect(judgeSequenceClick([1, 8, 3], 1, 8)).toBe("continue");
    expect(judgeSequenceClick([1, 8, 3], 2, 3)).toBe("complete");
  });
});

describe("visual memory", () => {
  it("grows the grid so the pattern stays sparse", () => {
    expect(visualLevelSpec(1)).toEqual({ size: 3, remember: 3 });
    expect(visualLevelSpec(8)).toEqual({ size: 5, remember: 10 });
  });

  it("picks distinct cells and completes on the last hit", () => {
    const pattern = pickVisualPattern(3, 3, cycle([0.1, 0.8, 0.4]));
    expect(new Set(pattern).size).toBe(3);
    const targets = new Set(pattern);
    const first = pattern[0] ?? 0;
    expect(judgeVisualClick(targets, new Set(), first)).toBe("hit");
    expect(
      judgeVisualClick(targets, new Set(pattern.slice(0, 2)), pattern[2] ?? 0),
    ).toBe("complete");
    expect(judgeVisualClick(targets, new Set(), 99)).toBe("miss");
  });
});

describe("chimp test", () => {
  it("places a unique 1..N and hides after the first hit", () => {
    const tokens = placeChimp(4, cycle([0.2, 0.9, 0.1, 0.5]));
    expect(tokens.map((token) => token.value)).toEqual([1, 2, 3, 4]);
    expect(new Set(tokens.map((token) => token.cell)).size).toBe(4);
    expect(tokens.every((token) => token.cell < CHIMP_CELLS)).toBe(true);
    expect(judgeChimpClick(1, 1, 4)).toBe("hide");
    expect(judgeChimpClick(2, 2, 4)).toBe("continue");
    expect(judgeChimpClick(4, 4, 4)).toBe("complete");
    expect(judgeChimpClick(2, 3, 4)).toBe("fail");
  });
});

describe("number memory", () => {
  it("builds a digit string and compares it exactly", () => {
    expect(randomDigits(3, cycle([0.04, 0.91, 0.52]))).toBe("095");
    expect(judgeNumberInput("095", "095")).toBe(true);
    expect(judgeNumberInput("095", "95")).toBe(false);
  });
});

describe("verbal memory", () => {
  it("replays a seen word when the coin says so", () => {
    const next = nextVerbalWord(["oak", "elm", "ash"], ["oak"], () => 0.1);
    expect(next).toEqual({ word: "oak", isSeen: true });
    expect(judgeVerbalMark(true, true)).toBe(true);
    expect(judgeVerbalMark(true, false)).toBe(false);
  });

  it("draws an unseen word when replay is declined", () => {
    const next = nextVerbalWord(["oak", "elm"], ["oak"], () => 0.9);
    expect(next.isSeen).toBe(false);
    expect(next.word).toBe("elm");
  });
});
