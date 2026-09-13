export const FIGURE_SHAPES = [
  "circle",
  "square",
  "triangle",
  "diamond",
  "hexagon",
  "cross",
  "arrow",
  "bar",
] as const;

export const FIGURE_FILLS = ["none", "solid", "hatch", "dots"] as const;

export const FIGURE_ROTATIONS = [0, 45, 90, 135, 180, 225, 270, 315] as const;

export const FIGURE_SIZES = [1, 2, 3] as const;

export const FIGURE_MAX_GRID = 4;
export const FIGURE_MAX_ELEMENTS = 4;
export const FIGURE_MAX_COUNT = 4;

export type FigureShape = (typeof FIGURE_SHAPES)[number];
export type FigureFill = (typeof FIGURE_FILLS)[number];
export type FigureRotation = (typeof FIGURE_ROTATIONS)[number];
export type FigureSize = (typeof FIGURE_SIZES)[number];

export type FigureElement = {
  shape: FigureShape;
  fill: FigureFill;
  rotation: FigureRotation;
  size: FigureSize;
  count: number;
};

export type FigureCell = {
  row: number;
  col: number;
  blank: boolean;
  elements: FigureElement[];
};

/**
 * Authored stimulus description. The renderer is deterministic, so the same
 * spec always draws the same figure; nothing is generated at runtime.
 */
export type FigureSpec = {
  kind: "grid";
  rows: number;
  cols: number;
  cells: FigureCell[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseElement(value: unknown, source: string): FigureElement {
  if (!isRecord(value)) {
    throw new Error(`${source} is not an object.`);
  }
  const shape = value.shape;
  if (!(FIGURE_SHAPES as readonly unknown[]).includes(shape)) {
    throw new Error(`${source} has an unknown shape.`);
  }
  const fill = value.fill ?? "none";
  if (!(FIGURE_FILLS as readonly unknown[]).includes(fill)) {
    throw new Error(`${source} has an unknown fill.`);
  }
  const rotation = value.rotation ?? 0;
  if (!(FIGURE_ROTATIONS as readonly unknown[]).includes(rotation)) {
    throw new Error(`${source} has an unsupported rotation.`);
  }
  const size = value.size ?? 2;
  if (!(FIGURE_SIZES as readonly unknown[]).includes(size)) {
    throw new Error(`${source} has an unsupported size.`);
  }
  const count = value.count ?? 1;
  if (
    typeof count !== "number" ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > FIGURE_MAX_COUNT
  ) {
    throw new Error(`${source} has an invalid count.`);
  }
  return {
    shape: shape as FigureShape,
    fill: fill as FigureFill,
    rotation: rotation as FigureRotation,
    size: size as FigureSize,
    count,
  };
}

function parseElements(value: unknown, source: string): FigureElement[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(`${source} elements must be an array.`);
  }
  if (value.length > FIGURE_MAX_ELEMENTS) {
    throw new Error(`${source} has more than ${FIGURE_MAX_ELEMENTS} elements.`);
  }
  return value.map((entry, index) =>
    parseElement(entry, `${source} element[${index}]`),
  );
}

function parseCell(
  value: unknown,
  rows: number,
  cols: number,
  source: string,
): FigureCell {
  if (!isRecord(value)) {
    throw new Error(`${source} is not an object.`);
  }
  const { row, col } = value;
  if (
    typeof row !== "number" ||
    !Number.isInteger(row) ||
    row < 1 ||
    row > rows
  ) {
    throw new Error(`${source} has a row outside the grid.`);
  }
  if (
    typeof col !== "number" ||
    !Number.isInteger(col) ||
    col < 1 ||
    col > cols
  ) {
    throw new Error(`${source} has a column outside the grid.`);
  }
  const blank = value.blank === true;
  const elements = parseElements(value.elements, source);
  if (blank && elements.length > 0) {
    throw new Error(`${source} is blank but carries elements.`);
  }
  return { row, col, blank, elements };
}

export function parseFigureSpec(value: unknown, source: string): FigureSpec {
  if (!isRecord(value)) {
    throw new Error(`${source} is not an object.`);
  }

  if (value.kind === "single") {
    const elements = parseElements(value.elements, source);
    if (elements.length === 0) {
      throw new Error(`${source} needs at least one element.`);
    }
    return {
      kind: "grid",
      rows: 1,
      cols: 1,
      cells: [{ row: 1, col: 1, blank: false, elements }],
    };
  }

  if (value.kind !== "grid") {
    throw new Error(`${source} has an unknown figure kind.`);
  }

  const { rows, cols, cells } = value;
  if (
    typeof rows !== "number" ||
    !Number.isInteger(rows) ||
    rows < 1 ||
    rows > FIGURE_MAX_GRID
  ) {
    throw new Error(`${source} has an invalid row count.`);
  }
  if (
    typeof cols !== "number" ||
    !Number.isInteger(cols) ||
    cols < 1 ||
    cols > FIGURE_MAX_GRID
  ) {
    throw new Error(`${source} has an invalid column count.`);
  }
  if (!Array.isArray(cells) || cells.length === 0) {
    throw new Error(`${source} needs at least one cell.`);
  }

  const parsed = cells.map((entry, index) =>
    parseCell(entry, rows, cols, `${source} cell[${index}]`),
  );

  const seen = new Set<string>();
  let blanks = 0;
  for (const cell of parsed) {
    const key = `${cell.row}:${cell.col}`;
    if (seen.has(key)) {
      throw new Error(`${source} defines cell ${key} twice.`);
    }
    seen.add(key);
    if (cell.blank) {
      blanks += 1;
    }
  }
  if (blanks > 1) {
    throw new Error(`${source} marks more than one blank cell.`);
  }

  return { kind: "grid", rows, cols, cells: parsed };
}

export function figureBlankCell(spec: FigureSpec): FigureCell | null {
  return spec.cells.find((cell) => cell.blank) ?? null;
}

/**
 * Stable serialization of what a spec draws: two specs with the same signature
 * render identically. Element order inside a cell is preserved because the
 * renderer lays marks out in that order.
 */
export function figureSignature(
  spec: FigureSpec,
  options: { ignoreSize?: boolean } = {},
): string {
  const cells = spec.cells
    .slice()
    .sort((left, right) => left.row - right.row || left.col - right.col)
    .map((cell) => {
      const drawn = cell.blank
        ? "_"
        : cell.elements
            .map((element) =>
              [
                element.shape,
                element.fill,
                element.rotation,
                options.ignoreSize ? "" : element.size,
                element.count,
              ].join("/"),
            )
            .join("+");
      return `${cell.row},${cell.col}:${drawn}`;
    });
  return `${spec.rows}x${spec.cols};${cells.join(";")}`;
}
