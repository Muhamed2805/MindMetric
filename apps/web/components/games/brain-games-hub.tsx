"use client";

import { Button } from "@mindmetric/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BRAIN_GAME_DISCLAIMER,
  BRAIN_GAMES,
  emptyBrainGameStats,
  getBrainGame,
  readBrainGameStats,
  type BrainGameSlug,
} from "../../lib/brain-games";

export function BrainGamesHub({
  featuredSlug,
}: {
  featuredSlug: BrainGameSlug;
}) {
  const [bests, setBests] = useState<Record<string, number>>({});

  useEffect(() => {
    const next: Record<string, number> = {};
    for (const game of BRAIN_GAMES) {
      next[game.slug] = readBrainGameStats(game.slug).best;
    }
    setBests(next);
  }, []);

  const featured = getBrainGame(featuredSlug) ?? BRAIN_GAMES[0];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-4xl font-medium tracking-tight">
          Brain Games
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          Short, repeatable drills. They are not assessments, and they are never
          mixed into the cognitive battery.
        </p>
      </div>

      {featured ? (
        <div className="mm-panel flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-mark">
              Today&apos;s pick
            </p>
            <p className="mt-1 font-serif text-2xl font-medium">
              {featured.title}
            </p>
            <p className="mt-1 text-sm text-muted">{featured.prompt}</p>
          </div>
          <Button asChild>
            <Link href={`/games/${featured.slug}`}>Start</Link>
          </Button>
        </div>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {BRAIN_GAMES.map((game) => {
          const best = bests[game.slug] ?? emptyBrainGameStats().best;
          return (
            <li key={game.slug} className="mm-panel flex flex-col px-5 py-5">
              <p className="font-medium text-ink">{game.title}</p>
              <p className="mt-1 text-sm text-muted">{game.skill}</p>
              <p className="mt-3 flex-1 text-sm leading-6 text-muted">
                {game.tagline}
              </p>
              <p className="mt-3 text-sm text-muted">
                Best {best} {game.scoreLabel.toLowerCase()}
              </p>
              <Button asChild variant="secondary" className="mt-4">
                <Link href={`/games/${game.slug}`}>Play</Link>
              </Button>
            </li>
          );
        })}
      </ul>

      <p className="max-w-xl text-sm leading-6 text-muted">
        {BRAIN_GAME_DISCLAIMER} Scores stay on this device for now.
      </p>
    </div>
  );
}
