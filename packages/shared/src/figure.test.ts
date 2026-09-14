import { describe, expect, it } from "vitest";
import { figureBlankCell, figureSignature, parseFigureSpec } from "./figure";

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

describe("figureSignature", () => {
  it("treats rotations that do not change the drawing as identical", () => {
    const square0 = parseFigureSpec(
      { kind: "single", elements: [{ shape: "square", rotation: 0 }] },
      "a",
    );
    const square90 = parseFigureSpec(
      { kind: "single", elements: [{ shape: "square", rotation: 90 }] },
      "b",
    );
    const diamond45 = parseFigureSpec(
      { kind: "single", elements: [{ shape: "diamond", rotation: 45 }] },
      "c",
    );
    const diamond135 = parseFigureSpec(
      { kind: "single", elements: [{ shape: "diamond", rotation: 135 }] },
      "d",
    );
    const hex90 = parseFigureSpec(
      { kind: "single", elements: [{ shape: "hexagon", rotation: 90 }] },
      "e",
    );
    const hex270 = parseFigureSpec(
      { kind: "single", elements: [{ shape: "hexagon", rotation: 270 }] },
      "f",
    );
    const bar0 = parseFigureSpec(
      { kind: "single", elements: [{ shape: "bar", rotation: 0 }] },
      "g",
    );
    const bar180 = parseFigureSpec(
      { kind: "single", elements: [{ shape: "bar", rotation: 180 }] },
      "h",
    );
    const arrow0 = parseFigureSpec(
      { kind: "single", elements: [{ shape: "arrow", rotation: 0 }] },
      "i",
    );
    const arrow90 = parseFigureSpec(
      { kind: "single", elements: [{ shape: "arrow", rotation: 90 }] },
      "j",
    );

    expect(figureSignature(square0)).toBe(figureSignature(square90));
    expect(figureSignature(diamond45)).toBe(figureSignature(diamond135));
    expect(figureSignature(hex90)).toBe(figureSignature(hex270));
    expect(figureSignature(bar0)).toBe(figureSignature(bar180));
    expect(figureSignature(arrow0)).not.toBe(figureSignature(arrow90));
  });
});
