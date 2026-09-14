"use client";

import { cn } from "@mindmetric/ui";
import { useEffect, useRef, useState } from "react";
import {
  gridCells,
  judgeVisualClick,
  pickVisualPattern,
  VISUAL_LIVES,
  VISUAL_SHOW_MS,
  visualLevelSpec,
} from "../../lib/brain-game-engine";
import {
  GameOverScreen,
  GameStage,
  GameStartScreen,
  GameStatus,
  sleep,
} from "./game-stage";

export function VisualMemoryPlay({
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
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(VISUAL_LIVES);
  const [size, setSize] = useState(3);
  const [targets, setTargets] = useState<Set<number>>(new Set());
  const [found, setFound] = useState<Set<number>>(new Set());
  const [missed, setMissed] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState(true);
  const [score, setScore] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  async function deal(nextLevel: number, nextLives: number) {
    const spec = visualLevelSpec(nextLevel);
    const pattern = pickVisualPattern(spec.size, spec.remember, Math.random);
    setLevel(nextLevel);
    setLives(nextLives);
    setSize(spec.size);
    setTargets(new Set(pattern));
    setFound(new Set());
    setMissed(new Set());
    setRevealed(true);
    setPhase("watch");
    await sleep(VISUAL_SHOW_MS);
    if (cancelled.current) {
      return;
    }
    setRevealed(false);
    setPhase("input");
  }

  function begin() {
    setScore(0);
    void deal(1, VISUAL_LIVES);
  }

  function finish(finalScore: number) {
    setScore(finalScore);
    setPhase("over");
    onScore(finalScore);
  }

  function onCell(cell: number) {
    if (phase !== "input" || found.has(cell) || missed.has(cell)) {
      return;
    }
    const verdict = judgeVisualClick(targets, found, cell);
    if (verdict === "miss") {
      const nextLives = lives - 1;
      setMissed((current) => new Set(current).add(cell));
      setLives(nextLives);
      if (nextLives <= 0) {
        finish(level - 1);
      }
      return;
    }
    const nextFound = new Set(found).add(cell);
    setFound(nextFound);
    if (verdict === "complete") {
      setScore(level);
      void deal(level + 1, lives);
    }
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
            {scoreLabel} {level} · lives {lives}
          </GameStatus>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
          >
            {gridCells(size).map((cell) => {
              const isTarget = targets.has(cell);
              const showTarget = revealed && isTarget;
              const isFound = found.has(cell);
              const isMiss = missed.has(cell);
              return (
                <button
                  key={cell}
                  type="button"
                  aria-label={`Tile ${cell + 1}`}
                  disabled={phase !== "input"}
                  onClick={() => onCell(cell)}
                  className={cn(
                    "h-12 w-12 rounded-lg transition-colors md:h-14 md:w-14",
                    showTarget || isFound
                      ? "bg-canvas"
                      : isMiss
                        ? "bg-danger"
                        : "bg-accent-fg/20",
                  )}
                />
              );
            })}
          </div>
        </>
      ) : null}
    </GameStage>
  );
}
