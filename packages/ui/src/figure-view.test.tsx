import { parseFigureSpec } from "@mindmetric/shared";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FigureView } from "./figure-view";

const CELL = 72;
const PAD = 6;

function draw(input: unknown, cellSize = CELL) {
  const spec = parseFigureSpec(input, "spec");
  return renderToStaticMarkup(
    <FigureView spec={spec} idPrefix="fx" cellSize={cellSize} />,
  );
}

/** Pattern definitions carry their own lines and stroke widths. */
function body(markup: string) {
  return markup.replace(/<defs>.*<\/defs>/s, "");
}

function squares(markup: string) {
  return [...markup.matchAll(/<rect (?![^>]*stroke-dasharray)[^>]*>/g)].map(
    (match) => {
      const attr = (name: string) =>
        Number(new RegExp(`${name}="([\\d.-]+)"`).exec(match[0])?.[1]);
      return {
        x: attr("x"),
        y: attr("y"),
        width: attr("width"),
        height: attr("height"),
      };
    },
  );
}

function single(count: number, extra: Record<string, unknown> = {}) {
  return {
    kind: "single",
    elements: [{ shape: "square", count, ...extra }],
  };
}

describe("FigureView", () => {
  it("draws one mark per count", () => {
    expect(squares(draw(single(1)))).toHaveLength(1);
    expect(squares(draw(single(3)))).toHaveLength(3);
    expect(squares(draw(single(4)))).toHaveLength(4);
  });

  it("keeps every mark inside its cell", () => {
    for (const count of [1, 2, 3, 4]) {
      for (const size of [1, 2, 3]) {
        for (const mark of squares(draw(single(count, { size })))) {
          expect(mark.x).toBeGreaterThanOrEqual(PAD);
          expect(mark.y).toBeGreaterThanOrEqual(PAD);
          expect(mark.x + mark.width).toBeLessThanOrEqual(PAD + CELL);
          expect(mark.y + mark.height).toBeLessThanOrEqual(PAD + CELL);
        }
      }
    }
  });

  it("arranges marks in a single row so only the number differs", () => {
    for (const count of [2, 3, 4]) {
      const rows = new Set(squares(draw(single(count))).map((mark) => mark.y));
      expect(rows.size).toBe(1);
    }
  });

  it("scales marks with size while holding stroke weight constant", () => {
    const small = squares(draw(single(1, { size: 1 })))[0];
    const large = squares(draw(single(1, { size: 3 })))[0];
    expect(large?.width).toBeGreaterThan(small?.width ?? 0);

    const widths = new Set(
      [1, 3].flatMap((size) =>
        [
          ...body(draw(single(1, { size }))).matchAll(
            /stroke-width="([\d.]+)"/g,
          ),
        ].map((match) => match[1]),
      ),
    );
    expect(widths).toEqual(new Set(["1.5"]));
  });

  it("renders the same markup for the same spec", () => {
    expect(draw(single(3))).toBe(draw(single(3)));
  });

  it("namespaces pattern ids so figures can share a page", () => {
    const markup = draw({
      kind: "single",
      elements: [{ shape: "circle", fill: "hatch" }],
    });
    expect(markup).toContain('id="fx-hatch"');
    expect(markup).toContain("url(#fx-hatch)");
  });

  it("marks the blank cell and separates grid cells", () => {
    const markup = draw({
      kind: "grid",
      rows: 3,
      cols: 3,
      cells: [
        { row: 1, col: 1, elements: [{ shape: "circle" }] },
        { row: 3, col: 3, blank: true },
      ],
    });
    expect(markup).toContain("stroke-dasharray");
    expect(markup).toContain("?");
    expect([...body(markup).matchAll(/<line /g)]).toHaveLength(4);
  });

  it("omits separators for a single-cell figure", () => {
    expect(body(draw(single(1)))).not.toContain("<line ");
  });
});
