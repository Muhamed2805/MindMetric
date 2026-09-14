"use client";

import { cn } from "@mindmetric/ui";
import { useEffect, useRef, useState } from "react";
import {
  extendSequence,
  judgeSequenceClick,
  SEQUENCE_CELL_COUNT,
  SEQUENCE_CELLS,
  SEQUENCE_GAP_MS,
  SEQUENCE_LEAD_MS,
  SEQUENCE_ON_MS,
} from "../../lib/brain-game-engine";
import {
  GameOverScreen,
  GameStage,
  GameStartScreen,
  GameStatus,
  sleep,
} from "./game-stage";

export function SequenceMemoryPlay({
  title,
  tagline,
  scoreLabel,
  onScore,
}: {
  title: string;
  tagline: string;
  scoreLabel: string;
  onScore: (score: number) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "watch" | "input" | "over">(
    "idle",
  );
  const [sequence, setSequence] = useState<number[]>([]);
  const [lit, setLit] = useState<number | null>(null);
  const [clickIndex, setClickIndex] = useState(0);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  async function playSequence(steps: number[]) {
    setPhase("watch");
    setLit(null);
    await sleep(SEQUENCE_LEAD_MS);
    for (const cell of steps) {
      if (cancelled.current) {
        return;
      }
      setLit(cell);
      await sleep(SEQUENCE_ON_MS);
      setLit(null);
      await sleep(SEQUENCE_GAP_MS);
    }
    if (cancelled.current) {
      return;
    }
    setClickIndex(0);
    setPhase("input");
  }

  function begin() {
    const next = extendSequence([], SEQUENCE_CELL_COUNT, Math.random);
    setSequence(next);
    setLevel(1);
    setScore(0);
    void playSequence(next);
  }

  function onCell(cell: number) {
    if (phase !== "input") {
      return;
    }
    const verdict = judgeSequenceClick(sequence, clickIndex, cell);
    if (verdict === "fail") {
      const finished = sequence.length - 1;
      setScore(finished);
      setPhase("over");
      onScore(finished);
      return;
    }
    if (verdict === "complete") {
      const finished = sequence.length;
      setScore(finished);
      setLevel(finished + 1);
      const next = extendSequence(sequence, SEQUENCE_CELL_COUNT, Math.random);
      setSequence(next);
      void playSequence(next);
      return;
    }
    setClickIndex((index) => index + 1);
  }

  return (
    <GameStage>
      {phase === "idle" ? (
        <GameStartScreen title={title} tagline={tagline} onStart={begin} />
      ) : null}
      {phase === "over" ? (
        <GameOverScreen scoreLabel={scoreLabel} score={score} onRetry={begin} />
      ) : null}
      {phase === "watch" || phase === "input" ? (
        <>
          <GameStatus>
            {scoreLabel} {level}
          </GameStatus>
          <div className="grid grid-cols-3 gap-3">
            {SEQUENCE_CELLS.map((cell) => (
              <button
                key={cell}
                type="button"
                aria-label={`Tile ${cell + 1}`}
                disabled={phase !== "input"}
                onClick={() => onCell(cell)}
                className={cn(
                  "h-[4.5rem] w-[4.5rem] rounded-xl transition-colors md:h-24 md:w-24",
                  lit === cell ? "bg-canvas" : "bg-accent-fg/20",
                  phase === "input" ? "cursor-pointer" : "cursor-default",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </GameStage>
  );
}
