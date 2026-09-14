"use client";

import { cn } from "@mindmetric/ui";
import { useState } from "react";
import {
  CHIMP_CELL_IDS,
  CHIMP_COLS,
  CHIMP_LIVES,
  CHIMP_START,
  type ChimpToken,
  judgeChimpClick,
  placeChimp,
} from "../../lib/brain-game-engine";
import {
  GameOverScreen,
  GameStage,
  GameStartScreen,
  GameStatus,
} from "./game-stage";

export function ChimpTestPlay({
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
  const [phase, setPhase] = useState<"idle" | "play" | "over">("idle");
  const [count, setCount] = useState(CHIMP_START);
  const [lives, setLives] = useState(CHIMP_LIVES);
  const [tokens, setTokens] = useState<ChimpToken[]>([]);
  const [expected, setExpected] = useState(1);
  const [hidden, setHidden] = useState(false);
  const [score, setScore] = useState(0);

  function deal(nextCount: number, nextLives: number) {
    setCount(nextCount);
    setLives(nextLives);
    setTokens(placeChimp(nextCount, Math.random));
    setExpected(1);
    setHidden(false);
    setPhase("play");
  }

  function begin() {
    setScore(0);
    deal(CHIMP_START, CHIMP_LIVES);
  }

  function onToken(value: number) {
    if (phase !== "play") {
      return;
    }
    const verdict = judgeChimpClick(expected, value, count);
    if (verdict === "fail") {
      const nextLives = lives - 1;
      if (nextLives <= 0) {
        setPhase("over");
        onScore(score);
        return;
      }
      deal(count, nextLives);
      return;
    }
    if (verdict === "complete") {
      setScore(count);
      deal(count + 1, lives);
      return;
    }
    if (verdict === "hide") {
      setHidden(true);
    }
    setExpected(expected + 1);
  }

  const byCell = new Map(tokens.map((token) => [token.cell, token]));

  return (
    <GameStage>
      {phase === "idle" ? (
        <GameStartScreen title={title} tagline={tagline} onStart={begin} />
      ) : null}
      {phase === "over" ? (
        <GameOverScreen scoreLabel={scoreLabel} score={score} onRetry={begin} />
      ) : null}
      {phase === "play" ? (
        <>
          <GameStatus>
            {scoreLabel} {count} · lives {lives}
          </GameStatus>
          <div
            className="grid w-full max-w-xl gap-2"
            style={{
              gridTemplateColumns: `repeat(${CHIMP_COLS}, minmax(0, 1fr))`,
            }}
          >
            {CHIMP_CELL_IDS.map((cell) => {
              const token = byCell.get(cell);
              if (!token) {
                return <span key={cell} className="h-12 md:h-14" />;
              }
              return (
                <button
                  key={cell}
                  type="button"
                  aria-label={
                    hidden ? "Hidden numeral" : `Numeral ${token.value}`
                  }
                  onClick={() => onToken(token.value)}
                  className={cn(
                    "flex h-12 items-center justify-center rounded-lg text-lg font-semibold md:h-14",
                    hidden
                      ? "bg-canvas text-transparent"
                      : "bg-canvas text-accent",
                  )}
                >
                  {hidden ? "" : token.value}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </GameStage>
  );
}
