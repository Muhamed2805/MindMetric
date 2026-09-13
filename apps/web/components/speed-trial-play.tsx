"use client";

import { Button, cn, FigureView } from "@mindmetric/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BatterySpeedItem } from "../lib/battery-types";

export type SpeedDecisionSubmit = {
  decisionId: string;
  choiceId: "same" | "different" | null;
};

export function SpeedTrialPlay({
  item,
  pending,
  remainingMs,
  onSubmit,
}: {
  item: BatterySpeedItem;
  pending: boolean;
  remainingMs: number | null;
  onSubmit: (decisions: SpeedDecisionSubmit[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const answers = useRef<Map<string, "same" | "different">>(new Map());
  const submitted = useRef(false);

  const finish = useCallback(
    (reason: "complete" | "time") => {
      if (submitted.current || pending) {
        return;
      }
      submitted.current = true;
      const decisions: SpeedDecisionSubmit[] = [];
      for (const [position, decision] of item.decisions.entries()) {
        const choiceId = answers.current.get(decision.id) ?? null;
        if (choiceId !== null) {
          decisions.push({ decisionId: decision.id, choiceId });
          continue;
        }
        if (reason === "complete" || position <= index) {
          decisions.push({ decisionId: decision.id, choiceId: null });
        }
      }
      onSubmit(decisions);
    },
    [index, item.decisions, onSubmit, pending],
  );

  useEffect(() => {
    if (remainingMs === null || remainingMs > 0) {
      return;
    }
    finish("time");
  }, [finish, remainingMs]);

  const decide = useCallback(
    (choiceId: "same" | "different") => {
      const current = item.decisions[index];
      if (!current || pending || submitted.current) {
        return;
      }
      answers.current.set(current.id, choiceId);
      if (index + 1 >= item.decisions.length) {
        finish("complete");
        return;
      }
      setIndex((value) => value + 1);
    },
    [finish, index, item.decisions, pending],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "s" || event.key === "1") {
        decide("same");
      }
      if (key === "d" || event.key === "2") {
        decide("different");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [decide]);

  const current = item.decisions[index];
  if (!current) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">
        Pair {index + 1} of {item.decisions.length}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-8">
        <FigureView
          spec={current.left}
          idPrefix={`${item.itemInstanceId}-${current.id}-l`}
          cellSize={88}
        />
        <FigureView
          spec={current.right}
          idPrefix={`${item.itemInstanceId}-${current.id}-r`}
          cellSize={88}
        />
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {item.choices.map((choice) => (
          <Button
            key={choice}
            type="button"
            disabled={pending}
            onClick={() => decide(choice)}
            className={cn("min-w-32 capitalize")}
          >
            {choice}
          </Button>
        ))}
      </div>

      <p className="text-center text-xs text-muted">
        Press S or 1 for same, D or 2 for different. Each choice is final.
      </p>
    </div>
  );
}
