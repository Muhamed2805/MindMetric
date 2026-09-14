export type Rng = () => number;

export function randomInt(rng: Rng, maxExclusive: number): number {
  if (maxExclusive <= 0) {
    throw new Error("maxExclusive must be positive.");
  }
  return Math.floor(rng() * maxExclusive);
}

export function pickN<T>(items: readonly T[], n: number, rng: Rng): T[] {
  if (n > items.length) {
    throw new Error("Cannot pick more items than the source holds.");
  }
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = randomInt(rng, i + 1);
    const swap = pool[i];
    pool[i] = pool[j] as T;
    pool[j] = swap as T;
  }
  return pool.slice(0, n);
}

export const SEQUENCE_CELL_COUNT = 9;
export const SEQUENCE_CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;
export const SEQUENCE_ON_MS = 520;
export const SEQUENCE_GAP_MS = 180;
export const SEQUENCE_LEAD_MS = 420;

export function extendSequence(
  sequence: readonly number[],
  cellCount: number,
  rng: Rng,
): number[] {
  return [...sequence, randomInt(rng, cellCount)];
}

export function judgeSequenceClick(
  sequence: readonly number[],
  clickIndex: number,
  cell: number,
): "continue" | "complete" | "fail" {
  if (sequence[clickIndex] !== cell) {
    return "fail";
  }
  if (clickIndex + 1 === sequence.length) {
    return "complete";
  }
  return "continue";
}

export const VISUAL_LIVES = 3;
export const VISUAL_SHOW_MS = 1300;

export function gridCells(size: number): number[] {
  return Array.from({ length: size * size }, (_, cell) => cell);
}

export function visualLevelSpec(level: number): {
  size: number;
  remember: number;
} {
  const remember = level + 2;
  let size = 3;
  while (size * size < remember * 2) {
    size += 1;
  }
  return { size, remember };
}

export function pickVisualPattern(
  size: number,
  remember: number,
  rng: Rng,
): number[] {
  const cells = Array.from({ length: size * size }, (_, index) => index);
  return pickN(cells, remember, rng);
}

export function judgeVisualClick(
  targets: ReadonlySet<number>,
  found: ReadonlySet<number>,
  cell: number,
): "hit" | "complete" | "miss" {
  if (!targets.has(cell) || found.has(cell)) {
    return "miss";
  }
  if (found.size + 1 === targets.size) {
    return "complete";
  }
  return "hit";
}

export const CHIMP_START = 4;
export const CHIMP_LIVES = 3;
export const CHIMP_COLS = 8;
export const CHIMP_ROWS = 5;
export const CHIMP_CELLS = CHIMP_COLS * CHIMP_ROWS;
export const CHIMP_CELL_IDS = Array.from(
  { length: CHIMP_CELLS },
  (_, cell) => cell,
);

export type ChimpToken = { cell: number; value: number };

export function placeChimp(count: number, rng: Rng): ChimpToken[] {
  const cells = pickN(
    Array.from({ length: CHIMP_CELLS }, (_, index) => index),
    count,
    rng,
  );
  return cells.map((cell, index) => ({ cell, value: index + 1 }));
}

export function judgeChimpClick(
  expected: number,
  value: number,
  last: number,
): "hide" | "continue" | "complete" | "fail" {
  if (value !== expected) {
    return "fail";
  }
  if (expected === last) {
    return "complete";
  }
  return expected === 1 ? "hide" : "continue";
}

export const NUMBER_LEAD_MS = 700;

export function randomDigits(length: number, rng: Rng): string {
  let value = "";
  for (let i = 0; i < length; i += 1) {
    value += String(randomInt(rng, 10));
  }
  return value;
}

export function numberShowMs(length: number): number {
  return NUMBER_LEAD_MS + length * 450;
}

export function judgeNumberInput(shown: string, typed: string): boolean {
  return typed.trim() === shown;
}

export const VERBAL_LIVES = 3;

export function nextVerbalWord(
  pool: readonly string[],
  seen: readonly string[],
  rng: Rng,
): { word: string; isSeen: boolean } {
  const unseen = pool.filter((word) => !seen.includes(word));
  const canReplay = seen.length > 0;
  const replay =
    canReplay && (unseen.length === 0 || rng() < 0.45)
      ? seen[randomInt(rng, seen.length)]
      : null;
  if (replay) {
    return { word: replay, isSeen: true };
  }
  const word = unseen[randomInt(rng, unseen.length)];
  if (!word) {
    throw new Error("Verbal pool is empty.");
  }
  return { word, isSeen: false };
}

export function judgeVerbalMark(isSeen: boolean, markedSeen: boolean): boolean {
  return isSeen === markedSeen;
}
