import { describe, expect, it } from "vitest";
import { figureBlankCell, parseFigureSpec } from "./figure";

describe("parseFigureSpec", () => {
  it("fills element defaults so authored JSON stays terse", () => {
    const spec = parseFigureSpec(
      {
        kind: "grid",
        rows: 1,
        cols: 2,
        cells: [
          { row: 1, col: 1, elements: [{ shape: "circle" }] },
          { row: 1, col: 2, blank: true },
        ],
      },
      "figure",
    );

    expect(spec.cells[0]?.elements[0]).toEqual({
      shape: "circle",
      fill: "none",
      rotation: 0,
      size: 2,
      count: 1,
    });
    expect(figureBlankCell(spec)?.col).toBe(2);
  });

  it("normalizes a single figure to a one-cell grid", () => {
    const spec = parseFigureSpec(
      { kind: "single", elements: [{ shape: "arrow", rotation: 90 }] },
      "choice",
    );

    expect(spec).toMatchObject({ kind: "grid", rows: 1, cols: 1 });
    expect(spec.cells).toHaveLength(1);
  });

  it("rejects a cell outside the grid", () => {
    expect(() =>
      parseFigureSpec(
        {
          kind: "grid",
          rows: 2,
          cols: 2,
          cells: [{ row: 3, col: 1, elements: [{ shape: "circle" }] }],
        },
        "figure",
      ),
    ).toThrow(/row outside the grid/);
  });

  it("rejects a duplicate cell", () => {
    expect(() =>
      parseFigureSpec(
        {
          kind: "grid",
          rows: 1,
          cols: 2,
          cells: [
            { row: 1, col: 1, elements: [{ shape: "circle" }] },
            { row: 1, col: 1, elements: [{ shape: "square" }] },
          ],
        },
        "figure",
      ),
    ).toThrow(/twice/);
  });

  it("rejects more than one blank cell", () => {
    expect(() =>
      parseFigureSpec(
        {
          kind: "grid",
          rows: 1,
          cols: 2,
          cells: [
            { row: 1, col: 1, blank: true },
            { row: 1, col: 2, blank: true },
          ],
        },
        "figure",
      ),
    ).toThrow(/more than one blank/);
  });

  it("rejects a blank cell that still carries elements", () => {
    expect(() =>
      parseFigureSpec(
        {
          kind: "grid",
          rows: 1,
          cols: 1,
          cells: [
            { row: 1, col: 1, blank: true, elements: [{ shape: "circle" }] },
          ],
        },
        "figure",
      ),
    ).toThrow(/blank but carries elements/);
  });

  it("rejects an unsupported rotation", () => {
    expect(() =>
      parseFigureSpec(
        { kind: "single", elements: [{ shape: "arrow", rotation: 30 }] },
        "choice",
      ),
    ).toThrow(/rotation/);
  });
});
