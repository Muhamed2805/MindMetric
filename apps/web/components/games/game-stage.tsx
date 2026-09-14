import { Button, cn } from "@mindmetric/ui";
import type { ReactNode } from "react";

export function GameStage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative flex min-h-[28rem] flex-col items-center justify-center overflow-hidden bg-accent px-4 py-10 text-accent-fg md:min-h-[34rem] md:rounded-2xl",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function GameStartScreen({
  title,
  tagline,
  onStart,
}: {
  title: string;
  tagline: string;
  onStart: () => void;
}) {
  return (
    <div className="flex max-w-lg flex-col items-center text-center">
      <h1 className="font-serif text-4xl font-medium tracking-tight md:text-5xl">
        {title}
      </h1>
      <p className="mt-4 text-lg leading-7 text-accent-fg/80">{tagline}</p>
      <Button
        className="mt-8 bg-canvas text-accent hover:bg-surface"
        onClick={onStart}
      >
        Start
      </Button>
    </div>
  );
}

export function GameOverScreen({
  scoreLabel,
  score,
  onRetry,
}: {
  scoreLabel: string;
  score: number;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-[11px] font-medium uppercase tracking-widest text-accent-fg/70">
        {scoreLabel}
      </p>
      <p className="mt-2 font-serif text-6xl font-medium tracking-tight">
        {score}
      </p>
      <Button
        className="mt-8 bg-canvas text-accent hover:bg-surface"
        onClick={onRetry}
      >
        Try again
      </Button>
    </div>
  );
}

export function GameStatus({ children }: { children: ReactNode }) {
  return (
    <p className="mb-6 text-sm font-medium uppercase tracking-widest text-accent-fg/70">
      {children}
    </p>
  );
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
