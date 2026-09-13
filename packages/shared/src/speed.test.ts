import { describe, expect, it } from "vitest";
import { parseFigureSpec } from "./figure";
import {
  parseSpeedFormDefinition,
  parseSpeedTrialContent,
  speedKey,
  toClientSpeedTrial,
} from "./speed";

function mark(
  shape: "circle" | "square" | "triangle",
  extras: { size?: 1 | 2 | 3 } = {},
) {
  return parseFigureSpec(
    {
      kind: "single",
      elements: [{ shape, fill: "solid", ...extras }],
    },
    "mark",
  );
}

function pair(
  id: string,
  same: boolean,
  right: "circle" | "square" | "triangle" = "square",
) {
  return {
    id,
    same,
    left: mark("circle"),
    right: mark(same ? "circle" : right),
  };
}

function trial(
  decisions: Array<{
    id: string;
    same: boolean;
    right?: "circle" | "square" | "triangle";
  }>,
) {
  return parseSpeedTrialContent(
    {
      engine: "speed-trial-v1",
      domain: "gs",
      prompt: "Same or different?",
      k: 2,
      decisions: decisions.map((entry) =>
        pair(entry.id, entry.same, entry.right),
      ),
    },
    "trial",
  );
}

describe("parseSpeedTrialContent", () => {
  it("keeps the key off the client copy", () => {
    const content = trial([
      { id: "d1", same: true },
      { id: "d2", same: false },
      { id: "d3", same: true },
      { id: "d4", same: false, right: "triangle" },
    ]);
    const client = toClientSpeedTrial(content);

    const second = content.decisions[1];
    expect(second).toBeDefined();
    if (second === undefined) {
      throw new Error("expected a second decision");
    }
    expect(speedKey(second)).toBe("different");
    expect(JSON.stringify(client)).not.toContain('"same":');
    expect(client.decisions).toHaveLength(4);
  });

  it("rejects a pair marked same when the figures differ", () => {
    expect(() =>
      parseSpeedTrialContent(
        {
          engine: "speed-trial-v1",
          domain: "gs",
          prompt: "Same or different?",
          k: 2,
          decisions: [
            {
              id: "d1",
              same: true,
              left: mark("circle"),
              right: mark("square"),
            },
            pair("d2", true),
            pair("d3", false),
            pair("d4", false, "triangle"),
          ],
        },
        "bad",
      ),
    ).toThrow(/marked same/);
  });

  it("rejects a pair that differs only in size", () => {
    expect(() =>
      parseSpeedTrialContent(
        {
          engine: "speed-trial-v1",
          domain: "gs",
          prompt: "Same or different?",
          k: 2,
          decisions: [
            {
              id: "d1",
              same: false,
              left: mark("circle"),
              right: mark("circle", { size: 3 }),
            },
            pair("d2", true),
            pair("d3", false),
            pair("d4", false, "triangle"),
          ],
        },
        "bad",
      ),
    ).toThrow(/only in size/);
  });

  it("rejects k other than 2", () => {
    expect(() =>
      parseSpeedTrialContent(
        {
          engine: "speed-trial-v1",
          domain: "gs",
          prompt: "x",
          k: 3,
          decisions: [],
        },
        "bad",
      ),
    ).toThrow(/k=2/);
  });
});

describe("parseSpeedFormDefinition", () => {
  it("pins the speed-corrected model and a trial clock", () => {
    const form = parseSpeedFormDefinition(
      {
        engine: "speed-form-v1",
        domain: "gs",
        scoringModel: "speed-corrected-v1",
        trialTimeLimitMs: 90_000,
        sampleItemRevisionIds: ["gs-s-001-r1"],
        itemRevisionIds: ["gs-t-001-r1", "gs-t-002-r1"],
      },
      "form",
    );
    expect(form.itemRevisionIds).toHaveLength(2);
    expect(form.trialTimeLimitMs).toBe(90_000);
  });
});
