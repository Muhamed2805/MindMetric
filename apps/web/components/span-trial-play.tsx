"use client";

import { Button, cn } from "@mindmetric/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BatterySpanItem } from "../lib/battery-types";

function cellId(row: number, col: number) {
  return `r${row}c${col}`;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function SpanTrialPlay({
  item,
  pending,
  remainingMs,
  onSubmit,
}: {
  item: BatterySpanItem;
  pending: boolean;
  remainingMs: number | null;
  onSubmit: (recalled: string[]) => void;
}) {
  const [phase, setPhase] = useState<"watch" | "recall">("watch");
  const [highlight, setHighlight] = useState<string | null>(null);
  const [recalled, setRecalled] = useState<string[]>([]);
  const submitted = useRef(false);

  const finish = useCallback(
    (cells: string[]) => {
      if (submitted.current || pending) {
        return;
      }
      submitted.current = true;
      onSubmit(cells);
    },
    [onSubmit, pending],
  );

  useEffect(() => {
    let cancelled = false;
    const play = async () => {
      for (const [index, cell] of item.sequence.entries()) {
        if (cancelled) {
          return;
        }
        setHighlight(cell);
        await wait(item.stimulusMs);
        if (cancelled) {
          return;
        }
        setHighlight(null);
        if (index < item.sequence.length - 1) {
          await wait(item.isiMs);
        }
      }
      if (!cancelled) {
        setPhase("recall");
      }
    };
    void play();
    return () => {
      cancelled = true;
    };
  }, [item.isiMs, item.sequence, item.stimulusMs]);

  useEffect(() => {
    if (remainingMs === null || remainingMs > 0) {
      return;
    }
    finish(recalled);
  }, [finish, recalled, remainingMs]);

  const tap = useCallback(
    (id: string) => {
      if (phase !== "recall" || pending || submitted.current) {
        return;
      }
      const next = [...recalled, id];
      setRecalled(next);
      if (next.length >= item.length) {
        finish(next);
      }
    },
    [finish, item.length, pending, phase, recalled],
  );

  const cells: string[] = [];
  for (let row = 1; row <= item.grid.rows; row += 1) {
    for (let col = 1; col <= item.grid.cols; col += 1) {
      cells.push(cellId(row, col));
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-sm text-muted">
        {phase === "watch"
          ? "Watch the highlighted cells."
          : item.recall === "reverse"
            ? "Tap the cells in reverse order."
            : "Tap the cells in the same order."}
      </p>
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${item.grid.cols}, minmax(0, 4.5rem))`,
        }}
      >
        {cells.map((id) => {
          const lit = highlight === id;
          const tapped = recalled.includes(id);
          return (
            <button
              key={id}
              type="button"
              disabled={phase !== "recall" || pending}
              aria-label={`Cell ${id}`}
              onClick={() => tap(id)}
              className={cn(
                "aspect-square rounded-xl border transition",
                lit
                  ? "border-accent bg-accent"
                  : tapped && phase === "recall"
                    ? "border-mark bg-accent/10"
                    : "border-line bg-canvas",
                phase !== "recall" || pending ? "cursor-default" : "",
              )}
            />
          );
        })}
      </div>
      {phase === "recall" ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-muted tabular-nums">
            {recalled.length} of {item.length}
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => finish(recalled)}
          >
            Done
          </Button>
        </div>
      ) : null}
    </div>
  );
}
