import { Button } from "@mindmetric/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brain Games",
};

const games = [
  { title: "Reaction Time", detail: "Speed" },
  { title: "Chimp Test", detail: "Working memory" },
  { title: "Sequence Memory", detail: "Sequencing" },
  { title: "Visual Memory", detail: "Recall" },
  { title: "Number Memory", detail: "Working memory" },
  { title: "Verbal Memory", detail: "Language" },
];

export default function GamesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-4xl font-medium tracking-tight">
          Brain Games
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          Quick, repeatable exercises to train and track specific skills. The
          layout is ready; the timed engines are not wired yet.
        </p>
      </div>
      <div className="mm-panel flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-mark">
            Today&apos;s pick
          </p>
          <p className="mt-1 font-serif text-2xl font-medium">
            Sequence Memory
          </p>
          <p className="mt-1 text-sm text-muted">
            A focused three-minute session — coming with the games engine.
          </p>
        </div>
        <Button type="button" disabled>
          Start game
        </Button>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {games.map((game) => (
          <li key={game.title} className="mm-panel px-5 py-5">
            <p className="font-medium text-ink">{game.title}</p>
            <p className="mt-1 text-sm text-muted">{game.detail}</p>
            <Button type="button" variant="secondary" className="mt-4" disabled>
              Play now
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
