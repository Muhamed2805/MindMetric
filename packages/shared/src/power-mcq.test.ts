import { describe, expect, it } from "vitest";
import {
  parsePowerFormDefinition,
  parsePowerMcqItemContent,
  toClientPowerItem,
} from "./power-mcq";

const item = {
  engine: "power-mcq-v1",
  domain: "gf",
  difficulty: "easy",
  stimulus: {
    type: "figure",
    figure: {
      kind: "grid",
      rows: 1,
      cols: 2,
      cells: [
        { row: 1, col: 1, elements: [{ shape: "circle" }] },
        { row: 1, col: 2, blank: true },
      ],
    },
  },
  correctChoiceId: "b",
  choices: [
    {
      id: "a",
      content: {
        type: "figure",
        figure: { kind: "single", elements: [{ shape: "square" }] },
      },
    },
    {
      id: "b",
      content: {
        type: "figure",
        figure: { kind: "single", elements: [{ shape: "circle" }] },
      },
    },
  ],
};

const form = {
  engine: "power-form-v1",
  domain: "gf",
  scoringModel: "accuracy-power-v1",
  sectionTimeLimitMs: 300000,
  itemCeilingMs: 90000,
  itemRevisionIds: ["one-r1", "two-r1"],
  sampleItemRevisionIds: ["sample-r1"],
};

describe("parsePowerMcqItemContent", () => {
  it("defaults prompt and anchor", () => {
    const parsed = parsePowerMcqItemContent(item, "item");
    expect(parsed.prompt).toBeNull();
    expect(parsed.anchor).toBe(false);
  });

  it("rejects a key that is not one of the choices", () => {
    expect(() =>
      parsePowerMcqItemContent({ ...item, correctChoiceId: "z" }, "item"),
    ).toThrow(/key that is not one of its choices/);
  });

  it("rejects a repeated choice id", () => {
    expect(() =>
      parsePowerMcqItemContent(
        { ...item, choices: [item.choices[0], item.choices[0]] },
        "item",
      ),
    ).toThrow(/repeats id/);
  });

  it("requires an intended difficulty", () => {
    expect(() =>
      parsePowerMcqItemContent({ ...item, difficulty: undefined }, "item"),
    ).toThrow(/intended difficulty/);
  });

  it("rejects two choices that render identically", () => {
    expect(() =>
      parsePowerMcqItemContent(
        {
          ...item,
          choices: [
            item.choices[0],
            item.choices[1],
            { id: "c", content: item.choices[1]?.content },
          ],
        },
        "item",
      ),
    ).toThrow(/choices b and c render identically/);
  });

  it("rejects choices that differ only by an invisible rotation", () => {
    expect(() =>
      parsePowerMcqItemContent(
        {
          ...item,
          choices: [
            {
              id: "a",
              content: {
                type: "figure",
                figure: {
                  kind: "single",
                  elements: [{ shape: "triangle" }],
                },
              },
            },
            {
              id: "b",
              content: {
                type: "figure",
                figure: {
                  kind: "single",
                  elements: [{ shape: "square", rotation: 0 }],
                },
              },
            },
            {
              id: "c",
              content: {
                type: "figure",
                figure: {
                  kind: "single",
                  elements: [{ shape: "square", rotation: 90 }],
                },
              },
            },
          ],
        },
        "item",
      ),
    ).toThrow(/choices b and c render identically/);
  });

  it("rejects a choice that differs from another only in size", () => {
    expect(() =>
      parsePowerMcqItemContent(
        {
          ...item,
          choices: [
            item.choices[0],
            item.choices[1],
            {
              id: "c",
              content: {
                type: "figure",
                figure: {
                  kind: "single",
                  elements: [{ shape: "circle", size: 3 }],
                },
              },
            },
          ],
        },
        "item",
      ),
    ).toThrow(/choices b and c differ only in size/);
  });

  it("accepts choices that share a shape but differ in fill", () => {
    const parsed = parsePowerMcqItemContent(
      {
        ...item,
        choices: [
          item.choices[0],
          item.choices[1],
          {
            id: "c",
            content: {
              type: "figure",
              figure: {
                kind: "single",
                elements: [{ shape: "circle", fill: "hatch" }],
              },
            },
          },
        ],
      },
      "item",
    );
    expect(parsed.choices).toHaveLength(3);
  });
});

describe("parsePowerFormDefinition", () => {
  it("defaults sample items to an empty list", () => {
    const parsed = parsePowerFormDefinition(
      { ...form, sampleItemRevisionIds: undefined },
      "form",
    );
    expect(parsed.sampleItemRevisionIds).toEqual([]);
  });

  it("rejects a revision used as both sample and scored", () => {
    expect(() =>
      parsePowerFormDefinition(
        { ...form, sampleItemRevisionIds: ["one-r1"] },
        "form",
      ),
    ).toThrow(/both sample and scored/);
  });

  it("rejects an item ceiling longer than the section", () => {
    expect(() =>
      parsePowerFormDefinition({ ...form, itemCeilingMs: 400000 }, "form"),
    ).toThrow(/itemCeilingMs/);
  });

  it("rejects a repeated item revision", () => {
    expect(() =>
      parsePowerFormDefinition(
        { ...form, itemRevisionIds: ["one-r1", "one-r1"] },
        "form",
      ),
    ).toThrow(/repeats one-r1/);
  });
});

describe("toClientPowerItem", () => {
  it("reorders choices and withholds the key", () => {
    const parsed = parsePowerMcqItemContent(item, "item");
    const client = toClientPowerItem(parsed, ["b", "a"]);

    expect(client.choices.map((choice) => choice.id)).toEqual(["b", "a"]);
    expect(client).not.toHaveProperty("correctChoiceId");
  });

  it("rejects a presentation order that drops a choice", () => {
    const parsed = parsePowerMcqItemContent(item, "item");
    expect(() => toClientPowerItem(parsed, ["b"])).toThrow(
      /does not cover every choice/,
    );
  });
});
