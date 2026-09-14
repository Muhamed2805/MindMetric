import { Button } from "@mindmetric/ui";
import Link from "next/link";
import { MarketingFooter } from "../components/marketing-footer";
import { MarketingHeader } from "../components/marketing-header";
import { SampleReportCard } from "../components/sample-report-card";
import { apiGet } from "../lib/api.server";
import type { CatalogInstrument } from "../lib/assessment-types";
import { BRAIN_GAMES } from "../lib/brain-games";
import { getServerSession } from "../lib/session";
import { isPrimaryScale } from "../lib/workspace-nav";

function workspacePath(signedIn: boolean, path: string) {
  return signedIn ? path : `/login?from=${path}`;
}

export default async function HomePage() {
  const session = await getServerSession();
  let instruments: CatalogInstrument[] = [];

  try {
    instruments = await apiGet<CatalogInstrument[]>("/instruments");
  } catch {
    instruments = [];
  }

  const startHref = session ? "/tests" : "/register";
  const liveCount = instruments.filter((item) =>
    isPrimaryScale(item.slug),
  ).length;

  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4">
        <section className="grid items-center gap-12 py-14 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:py-20">
          <div className="flex max-w-xl flex-col gap-6">
            <p className="text-[11px] font-medium uppercase tracking-widest text-mark">
              Cognitive & psychometric assessments
            </p>
            <h1 className="font-serif text-[2.5rem] font-medium leading-[1.12] tracking-tight text-ink md:text-[3.5rem]">
              Understand how your mind works.
            </h1>
            <p className="max-w-md text-[17px] leading-7 text-muted">
              A calibration cognitive battery, a five-factor personality
              profile, and short work scales. Brain Games are practice. They
              never feed an IQ.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href={startHref}>Start an Assessment</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={workspacePath(Boolean(session), "/tests")}>
                  Explore assessments
                </Link>
              </Button>
            </div>
            <dl className="mt-4 flex flex-wrap gap-8">
              <div>
                <dt className="font-serif text-2xl font-medium text-ink">
                  {liveCount}
                </dt>
                <dd className="mt-1 text-xs text-muted">Live scales</dd>
              </div>
              <div>
                <dt className="font-serif text-2xl font-medium text-ink">
                  {BRAIN_GAMES.length}
                </dt>
                <dd className="mt-1 text-xs text-muted">Practice drills</dd>
              </div>
              <div>
                <dt className="font-serif text-2xl font-medium text-ink">S0</dt>
                <dd className="mt-1 text-xs text-muted">Raw totals, no IQ</dd>
              </div>
            </dl>
          </div>
          <div className="flex justify-center md:justify-end">
            <SampleReportCard />
          </div>
        </section>

        {/* biome-ignore lint/correctness/useUniqueElementIds: in-page hash target */}
        <section id="assessments" className="scroll-mt-24 py-10 md:py-16">
          <p className="text-[11px] font-medium uppercase tracking-widest text-mark">
            01 — Assessments
          </p>
          <h2 className="mt-3 font-serif text-4xl font-medium tracking-tight">
            Explore assessments
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <li>
              <CategoryCard
                href={workspacePath(Boolean(session), "/battery")}
                badge="Core"
                title="Cognitive battery"
                detail="Reasoning, speed, spatial, quantitative, and working memory. Raw totals, not an IQ."
                time="~40 min practice"
              />
            </li>
            <li>
              <CategoryCard
                href={workspacePath(Boolean(session), "/personality")}
                badge="Profile"
                title="Personality"
                detail="Big Five self-report of everyday tendencies"
                time="~10 min · 25 statements"
              />
            </li>
            <li>
              <CategoryCard
                href={workspacePath(
                  Boolean(session),
                  "/tests/work-emotion-awareness",
                )}
                badge="EQ"
                title="Emotional awareness"
                detail="A short workplace self-report. Not a full EQ battery and not a diagnosis."
                time="~2 min"
              />
            </li>
            <li>
              <CategoryCard
                href={workspacePath(Boolean(session), "/tests/work-attention")}
                badge="Work"
                title="Work attention"
                detail="A short self-report of staying with work despite interruptions"
                time="~2 min"
              />
            </li>
          </ul>
        </section>

        {/* biome-ignore lint/correctness/useUniqueElementIds: in-page hash target */}
        <section
          id="games"
          className="scroll-mt-24 border-t border-line py-10 md:py-16"
        >
          <p className="text-[11px] font-medium uppercase tracking-widest text-mark">
            02 — Brain Games
          </p>
          <h2 className="mt-3 font-serif text-4xl font-medium tracking-tight">
            Practice drills
          </h2>
          <p className="mt-3 max-w-lg text-[15px] leading-6 text-muted">
            Short memory drills you can repeat. They live in the workspace as
            practice, and they never feed the cognitive battery or an IQ score.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BRAIN_GAMES.map((game) => (
              <li key={game.slug}>
                <Link
                  href={workspacePath(Boolean(session), "/games")}
                  className="mm-panel flex items-start gap-3 px-4 py-4"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canvas text-accent">
                    <Bolt />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">{game.title}</p>
                    <p className="mt-0.5 text-sm text-muted">{game.tagline}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* biome-ignore lint/correctness/useUniqueElementIds: in-page hash target */}
        <section
          id="method"
          className="scroll-mt-24 grid gap-10 border-t border-line py-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:py-16"
        >
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-mark">
              03 — How It Works
            </p>
            <h2 className="mt-3 font-serif text-4xl font-medium leading-tight tracking-tight">
              Built around structure, not impressions.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-6 text-muted">
              Built around structured scoring, psychometric principles and
              transparent results. Every published version is frozen so a later
              edit cannot change a score you already have.
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            <MethodPoint
              title="Keyed on the server"
              body="Answers are scored with the published key. The client never receives correct-choice IDs for timed items."
            />
            <MethodPoint
              title="Bands, not ranks"
              body="Work scales show a keyed total and a band. Development tables ship with the version but are not shown as ranks. The cognitive battery has no percentile until a reference sample exists."
            />
            <MethodPoint
              title="Transparent methodology"
              body="Scoring models live in the catalog. The core battery currently reports raw section totals only. IQ, percentile, and interval stay empty until a reference sample exists."
            />
          </ul>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

function CategoryCard({
  href,
  badge,
  title,
  detail,
  time,
}: {
  href: string;
  badge: string;
  title: string;
  detail: string;
  time: string;
}) {
  return (
    <Link href={href} className="mm-panel flex h-full flex-col px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-canvas text-accent">
          <Bolt />
        </span>
        <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-mark">
          {badge}
        </span>
      </div>
      <p className="mt-5 text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 flex-1 text-sm leading-5 text-muted">{detail}</p>
      <p className="mt-4 text-sm text-muted">
        {time}
        <span className="ml-2 text-ink">→</span>
      </p>
    </Link>
  );
}

function MethodPoint({ title, body }: { title: string; body: string }) {
  return (
    <li className="mm-panel flex gap-3 px-4 py-4">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs text-accent-fg">
        ✓
      </span>
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
      </div>
    </li>
  );
}

function Bolt() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 3 4 14h7l-1 7 10-12h-7l0-6Z"
      />
    </svg>
  );
}
