import { Button } from "@mindmetric/ui";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-between px-4">
          <p className="text-base font-semibold tracking-tight">MindMetric</p>
          <Button asChild variant="secondary" size="sm">
            <Link href="/home">Open workspace</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 px-4 py-12 md:py-20">
        <h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
          Assessments for cognition, personality, and work style.
        </h1>
        <p className="max-w-lg text-base leading-7 text-muted md:text-lg">
          Take structured tests, keep a history of results, and read reports
          that stay on one design system from phone to desktop.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/tests">View catalog</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/home">Workspace</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
