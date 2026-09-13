import type { FigureElement, FigureSpec } from "@mindmetric/shared";
import type { ReactElement } from "react";
import { cn } from "./cn";

type Point = { x: number; y: number };

const SIZE_FACTOR: Record<number, number> = { 1: 0.75, 2: 1, 3: 1.2 };
const MAX_MARK_COLUMNS = 4;

const UNIT_POLYGONS: Record<string, Point[]> = {
  triangle: [
    { x: 0, y: -1 },
    { x: 0.95, y: 0.8 },
    { x: -0.95, y: 0.8 },
  ],
  diamond: [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ],
  hexagon: [
    { x: 1, y: 0 },
    { x: 0.5, y: 0.866 },
    { x: -0.5, y: 0.866 },
    { x: -1, y: 0 },
    { x: -0.5, y: -0.866 },
    { x: 0.5, y: -0.866 },
  ],
  cross: [
    { x: -0.36, y: -1 },
    { x: 0.36, y: -1 },
    { x: 0.36, y: -0.36 },
    { x: 1, y: -0.36 },
    { x: 1, y: 0.36 },
    { x: 0.36, y: 0.36 },
    { x: 0.36, y: 1 },
    { x: -0.36, y: 1 },
    { x: -0.36, y: 0.36 },
    { x: -1, y: 0.36 },
    { x: -1, y: -0.36 },
    { x: -0.36, y: -0.36 },
  ],
  arrow: [
    { x: 0, y: -1 },
    { x: 0.8, y: 0 },
    { x: 0.3, y: 0 },
    { x: 0.3, y: 1 },
    { x: -0.3, y: 1 },
    { x: -0.3, y: 0 },
    { x: -0.8, y: 0 },
  ],
};

/**
 * Marks in one cell always share a single arrangement rule, so a cell holding
 * four marks differs from one holding three only in number. Varying the
 * arrangement instead would give distractors a structural cue unrelated to the
 * rule being tested.
 */
function markLayout(count: number): { offsets: Point[]; radius: number } {
  const cols = Math.min(count, MAX_MARK_COLUMNS);
  const rows = Math.ceil(count / cols);
  const radius = 0.8 / Math.max(cols, rows);
  const offsets = Array.from({ length: count }, (_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      x: (2 * col + 1 - cols) / cols,
      y: rows === 1 ? 0 : (2 * row + 1 - rows) / rows,
    };
  });
  return { offsets, radius };
}

function fillFor(element: FigureElement, idPrefix: string) {
  if (element.fill === "solid") {
    return "currentColor";
  }
  if (element.fill === "hatch") {
    return `url(#${idPrefix}-hatch)`;
  }
  if (element.fill === "dots") {
    return `url(#${idPrefix}-dots)`;
  }
  return "none";
}

function renderMark(
  element: FigureElement,
  center: Point,
  radius: number,
  idPrefix: string,
  key: string,
): ReactElement {
  const fill = fillFor(element, idPrefix);
  const transform =
    element.rotation === 0
      ? undefined
      : `rotate(${element.rotation} ${center.x} ${center.y})`;
  const shared = {
    fill,
    stroke: "currentColor",
    strokeWidth: 1.5,
    transform,
  };

  if (element.shape === "circle") {
    return (
      <circle key={key} cx={center.x} cy={center.y} r={radius} {...shared} />
    );
  }
  if (element.shape === "square") {
    return (
      <rect
        key={key}
        x={center.x - radius}
        y={center.y - radius}
        width={radius * 2}
        height={radius * 2}
        {...shared}
      />
    );
  }
  if (element.shape === "bar") {
    const height = radius * 0.64;
    return (
      <rect
        key={key}
        x={center.x - radius}
        y={center.y - height / 2}
        width={radius * 2}
        height={height}
        {...shared}
      />
    );
  }

  const unit = UNIT_POLYGONS[element.shape] ?? UNIT_POLYGONS.diamond ?? [];
  const points = unit
    .map(
      (point) =>
        `${center.x + point.x * radius},${center.y + point.y * radius}`,
    )
    .join(" ");
  return <polygon key={key} points={points} {...shared} />;
}

export type FigureViewProps = {
  spec: FigureSpec;
  /** Required: SVG pattern ids must be unique within the document. */
  idPrefix: string;
  cellSize?: number;
  className?: string;
  label?: string;
};

/**
 * Deterministic renderer for authored stimuli. Geometry is computed in absolute
 * units instead of scaling a group, so stroke weight and pattern density stay
 * identical across figure sizes.
 */
export function FigureView({
  spec,
  idPrefix,
  cellSize = 72,
  className,
  label,
}: FigureViewProps) {
  const pad = 6;
  const width = spec.cols * cellSize + pad * 2;
  const height = spec.rows * cellSize + pad * 2;
  const inner = (cellSize / 2) * 0.82;
  const showGrid = spec.rows > 1 || spec.cols > 1;

  const marks: ReactElement[] = [];
  const blanks: ReactElement[] = [];

  for (const cell of spec.cells) {
    const cx = pad + (cell.col - 1) * cellSize + cellSize / 2;
    const cy = pad + (cell.row - 1) * cellSize + cellSize / 2;

    if (cell.blank) {
      const box = cellSize * 0.62;
      blanks.push(
        <g key={`blank-${cell.row}-${cell.col}`}>
          <rect
            x={cx - box / 2}
            y={cy - box / 2}
            width={box}
            height={box}
            rx={6}
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            className="stroke-line"
          />
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={cellSize * 0.3}
            className="fill-muted"
          >
            ?
          </text>
        </g>,
      );
      continue;
    }

    const expanded = cell.elements.flatMap((element) =>
      Array.from({ length: element.count }, () => element),
    );
    const layout = markLayout(expanded.length);
    const baseRadius = layout.radius * inner;

    expanded.forEach((element, index) => {
      const offset = layout.offsets[index] ?? { x: 0, y: 0 };
      marks.push(
        renderMark(
          element,
          { x: cx + offset.x * inner, y: cy + offset.y * inner },
          baseRadius * (SIZE_FACTOR[element.size] ?? 1),
          idPrefix,
          `${cell.row}-${cell.col}-${index}`,
        ),
      );
    });
  }

  const gridLines: ReactElement[] = [];
  if (showGrid) {
    for (let col = 1; col < spec.cols; col += 1) {
      const x = pad + col * cellSize;
      gridLines.push(
        <line
          key={`v-${col}`}
          x1={x}
          y1={pad}
          x2={x}
          y2={height - pad}
          strokeWidth={1}
          className="stroke-line"
        />,
      );
    }
    for (let row = 1; row < spec.rows; row += 1) {
      const y = pad + row * cellSize;
      gridLines.push(
        <line
          key={`h-${row}`}
          x1={pad}
          y1={y}
          x2={width - pad}
          y2={y}
          strokeWidth={1}
          className="stroke-line"
        />,
      );
    }
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("text-ink", className)}
      role="img"
      aria-label={label ?? "Figure"}
    >
      <defs>
        <pattern
          id={`${idPrefix}-hatch`}
          width={6}
          height={6}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={6}
            stroke="currentColor"
            strokeWidth={1.4}
          />
        </pattern>
        <pattern
          id={`${idPrefix}-dots`}
          width={6}
          height={6}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={1.6} cy={1.6} r={1} fill="currentColor" />
        </pattern>
      </defs>
      {gridLines}
      {marks}
      {blanks}
    </svg>
  );
}
