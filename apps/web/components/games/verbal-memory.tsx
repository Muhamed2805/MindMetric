"use client";

import { Button } from "@mindmetric/ui";
import { useState } from "react";
import {
  judgeVerbalMark,
  nextVerbalWord,
  VERBAL_LIVES,
} from "../../lib/brain-game-engine";
import { VERBAL_MEMORY_WORDS } from "../../lib/brain-game-words";
import {
  GameOverScreen,
  GameStage,
  GameStartScreen,
  GameStatus,
} from "./game-stage";

export function VerbalMemoryPlay({
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
  const [seen, setSeen] = useState<string[]>([]);
  const [word, setWord] = useState("");
  const [isSeen, setIsSeen] = useState(false);
  const [lives, setLives] = useState(VERBAL_LIVES);
  const [score, setScore] = useState(0);

  function deal(nextSeen: string[], nextScore: number, nextLives: number) {
    const next = nextVerbalWord(VERBAL_MEMORY_WORDS, nextSeen, Math.random);
    setSeen(nextSeen);
    setWord(next.word);
    setIsSeen(next.isSeen);
    setScore(nextScore);
    setLives(nextLives);
    setPhase("play");
  }

  function begin() {
    deal([], 0, VERBAL_LIVES);
  }

  function mark(markedSeen: boolean) {
    if (phase !== "play") {
      return;
    }
    if (!judgeVerbalMark(isSeen, markedSeen)) {
      const nextLives = lives - 1;
      if (nextLives <= 0) {
        setPhase("over");
        onScore(score);
        return;
      }
      deal(seen, score, nextLives);
      return;
    }
    const nextSeen = isSeen || seen.includes(word) ? seen : [...seen, word];
    deal(nextSeen, score + 1, lives);
  }

  return (
    <GameStage>
      {phase === "idle" ? (
        <GameStartScreen title={title} tagline={tagline} onStart={begin} />
      ) : null}
      {phase === "over" ? (
        <GameOverScreen scoreLabel={scoreLabel} score={score} onRetry={begin} />
      ) : null}
      {phase === "play" ? (
        <div className="flex flex-col items-center text-center">
          <GameStatus>
            {scoreLabel} {score} · lives {lives}
          </GameStatus>
          <p className="font-serif text-5xl font-medium capitalize tracking-tight md:text-6xl">
            {word}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button
              className="bg-canvas text-accent hover:bg-surface"
              onClick={() => mark(true)}
            >
              Seen
            </Button>
            <Button
              className="bg-transparent text-accent-fg ring-1 ring-accent-fg/30 hover:bg-accent-hover"
              onClick={() => mark(false)}
            >
              New
            </Button>
          </div>
        </div>
      ) : null}
    </GameStage>
  );
}
