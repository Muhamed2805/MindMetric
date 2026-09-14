"use client";

import { Button, Input } from "@mindmetric/ui";
import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  judgeNumberInput,
  numberShowMs,
  randomDigits,
} from "../../lib/brain-game-engine";
import {
  GameOverScreen,
  GameStage,
  GameStartScreen,
  GameStatus,
  sleep,
} from "./game-stage";

export function NumberMemoryPlay({
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
  const [length, setLength] = useState(1);
  const [shown, setShown] = useState("");
  const [typed, setTyped] = useState("");
  const [score, setScore] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  async function deal(nextLength: number) {
    const digits = randomDigits(nextLength, Math.random);
    setLength(nextLength);
    setShown(digits);
    setTyped("");
    setPhase("watch");
    await sleep(numberShowMs(nextLength));
    if (cancelled.current) {
      return;
    }
    setPhase("input");
  }

  function begin() {
    setScore(0);
    void deal(1);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (phase !== "input") {
      return;
    }
    if (!judgeNumberInput(shown, typed)) {
      setPhase("over");
      onScore(score);
      return;
    }
    setScore(length);
    void deal(length + 1);
  }

  return (
    <GameStage>
      {phase === "idle" ? (
        <GameStartScreen title={title} tagline={tagline} onStart={begin} />
      ) : null}
      {phase === "over" ? (
        <GameOverScreen scoreLabel={scoreLabel} score={score} onRetry={begin} />
      ) : null}
      {phase === "watch" ? (
        <>
          <GameStatus>
            {scoreLabel} {length}
          </GameStatus>
          <p className="font-serif text-6xl font-medium tracking-widest md:text-7xl">
            {shown}
          </p>
        </>
      ) : null}
      {phase === "input" ? (
        <form
          className="flex w-full max-w-sm flex-col items-center gap-4"
          onSubmit={onSubmit}
        >
          <GameStatus>What was the number?</GameStatus>
          <Input
            key={shown}
            autoFocus
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            aria-label="Number you saw"
            className="bg-canvas text-center font-serif text-2xl tracking-widest"
          />
          <Button
            className="bg-canvas text-accent hover:bg-surface"
            type="submit"
          >
            Submit
          </Button>
        </form>
      ) : null}
    </GameStage>
  );
}
