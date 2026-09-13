import { describe, expect, it } from "vitest";
import {
  generateSpatialSequence,
  parseSpanFormDefinition,
  parseSpanTrialContent,
  spanCellId,
  spanRecallTarget,
  spanTrialCeilingMs,
} from "./span";

describe("parseSpanTrialContent", () => {
  it("pins a reverse spatial trial without a sequence", () => {
    const parsed = parseSpanTrialContent(
      {
        engine: "span-trial-v1",
        domain: "gwm",
        procedure: "spatial-reverse-v1",
        length: 4,
        recall: "reverse",
        grid: { rows: 3, cols: 3 },
      },
      "trial",
    );

    expect(parsed.length).toBe(4);
    expect(parsed.recall).toBe("reverse");
  });

  it("rejects a length outside the authored ladder", () => {
    expect(() =>
      parseSpanTrialContent(
        {
          engine: "span-trial-v1",
          domain: "gwm",
          procedure: "spatial-reverse-v1",
          length: 10,
          recall: "reverse",
          grid: { rows: 3, cols: 3 },
        },
        "trial",
      ),
    ).toThrow(/invalid span length/);
  });
});

describe("parseSpanFormDefinition", () => {
  it("pins the span-partial model and a fixed presentation clock", () => {
    const parsed = parseSpanFormDefinition(
      {
        engine: "span-form-v1",
        domain: "gwm",
        scoringModel: "span-partial-v1",
        sectionTimeLimitMs: 480_000,
        stimulusMs: 1_000,
        isiMs: 250,
        recallCeilingMs: 20_000,
        itemRevisionIds: ["wm-1-r1"],
      },
      "form",
    );

    expect(parsed.stimulusMs).toBe(1_000);
    expect(parsed.itemRevisionIds).toEqual(["wm-1-r1"]);
  });
});

describe("generateSpatialSequence", () => {
  it("is deterministic for a seed and unique within a trial", () => {
    const first = generateSpatialSequence({
      length: 6,
      rows: 3,
      cols: 3,
      seed: "session-a:wm-sr-006a-r1",
    });
    const second = generateSpatialSequence({
      length: 6,
      rows: 3,
      cols: 3,
      seed: "session-a:wm-sr-006a-r1",
    });

    expect(first).toEqual(second);
    expect(new Set(first).size).toBe(6);
    expect(first.every((cell) => /^r[1-3]c[1-3]$/.test(cell))).toBe(true);
    expect(spanCellId(2, 3)).toBe("r2c3");
  });

  it("changes when the seed changes", () => {
    const left = generateSpatialSequence({
      length: 5,
      rows: 3,
      cols: 3,
      seed: "a",
    });
    const right = generateSpatialSequence({
      length: 5,
      rows: 3,
      cols: 3,
      seed: "b",
    });

    expect(left).not.toEqual(right);
  });
});

describe("spanRecallTarget", () => {
  it("reverses the shown sequence for spatial reverse", () => {
    expect(spanRecallTarget(["r1c1", "r2c2", "r3c3"], "reverse")).toEqual([
      "r3c3",
      "r2c2",
      "r1c1",
    ]);
  });
});

describe("spanTrialCeilingMs", () => {
  it("adds presentation time to the recall window", () => {
    expect(
      spanTrialCeilingMs(
        { stimulusMs: 1_000, isiMs: 250, recallCeilingMs: 20_000 },
        3,
      ),
    ).toBe(3_000 + 500 + 20_000);
  });
});
