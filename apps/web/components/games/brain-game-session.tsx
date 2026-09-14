"use client";

import { Button } from "@mindmetric/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BRAIN_GAME_DISCLAIMER,
  type BrainGame,
  emptyBrainGameStats,
  readBrainGameStats,
  recordBrainGameScore,
} from "../../lib/brain-games";
import { ChimpTestPlay } from "./chimp-test";
import { NumberMemoryPlay } from "./number-memory";
import { SequenceMemoryPlay } from "./sequence-memory";
import { VerbalMemoryPlay } from "./verbal-memory";
import { VisualMemoryPlay } from "./visual-memory";

export function BrainGameSession({ game }: { game: BrainGame }) {
  const [stats, setStats] = useState(emptyBrainGameStats);

  useEffect(() => {
    setStats(readBrainGameStats(game.slug));
  }, [game.slug]);

  function onScore(score: number) {
    setStats(recordBrainGameScore(game.slug, score));
  }

  const playProps = {
    title: game.title,
    tagline: game.tagline,
    scoreLabel: game.scoreLabel,
    onScore,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/games">Back to Brain Games</Link>
        </Button>
        <p className="text-sm text-muted">
          Best {stats.best} · last {stats.last}
          {stats.plays > 0 ? ` · ${stats.plays} runs` : ""}
        </p>
      </div>

      {game.slug === "sequence-memory" ? (
        <SequenceMemoryPlay {...playProps} />
      ) : null}
      {game.slug === "visual-memory" ? (
        <VisualMemoryPlay {...playProps} />
      ) : null}
      {game.slug === "chimp" ? <ChimpTestPlay {...playProps} /> : null}
      {game.slug === "number-memory" ? (
        <NumberMemoryPlay {...playProps} />
      ) : null}
      {game.slug === "verbal-memory" ? (
        <VerbalMemoryPlay {...playProps} />
      ) : null}

      <div className="mm-panel flex flex-col gap-3 p-5 text-sm leading-6 text-muted">
        <h2 className="font-serif text-xl text-ink">About this drill</h2>
        {game.about.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <p className="text-ink">{BRAIN_GAME_DISCLAIMER}</p>
      </div>
    </div>
  );
}
