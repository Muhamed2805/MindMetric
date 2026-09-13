import { Button } from "@mindmetric/ui";
import Link from "next/link";
import { MarketingFooter } from "../components/marketing-footer";
import { MarketingHeader } from "../components/marketing-header";
import { SampleReportCard } from "../components/sample-report-card";
import { apiGet } from "../lib/api.server";
import type { CatalogInstrument } from "../lib/assessment-types";
import { getServerSession } from "../lib/session";

const games = [
  { title: "Reaction Time", detail: "Visual stimulus response" },
  { title: "Chimp Test", detail: "Numerical memory sequence" },
  { title: "Sequence Memory", detail: "Pattern recall under pressure" },
  { title: "Verbal Memory", detail: "Word recognition and recall" },
  { title: "Visual Memory", detail: "Spatial pattern retention" },
  { title: "Number Memory", detail: "Digit span working memory" },
];

export default async function HomePage() {
  const session = await getServerSession();
  let instruments: CatalogInstrument[] = [];

  try {
    instruments = await apiGet<CatalogInstrument[]>("/instruments");
  } catch {
    instruments = [];
  }

  const startHref = session ? "/tests" : "/register";
  const liveCount = instruments.length;

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
              Measure reasoning, personality, memory and emotional intelligence
              through carefully designed assessments.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href={startHref}>Start an Assessment</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/tests">Explore Tests</Link>
              </Button>
            </div>
            <dl className="mt-4 flex flex-wrap gap-8">
              <div>
                <dt className="font-serif text-2xl font-medium text-ink">
                  {liveCount}
                </dt>
                <dd className="mt-1 text-xs text-muted">Published tests</dd>
              </div>
              <div>
                <dt className="font-serif text-2xl font-medium text-ink">4</dt>
                <dd className="mt-1 text-xs text-muted">Planned categories</dd>
              </div>
              <div>
                <dt className="font-serif text-2xl font-medium text-ink">
                  Live
                </dt>
                <dd className="mt-1 text-xs text-muted">Keyed on the server</dd>
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
                href="/tests"
                badge="Core"
                title="IQ & Cognitive"
                detail="Reasoning, spatial ability and numerical thinking"
                time="From 2 min"
              />
            </li>
            <li>
              <CategoryCard
                href="/tests"
                badge="Profile"
                title="Personality"
                detail="Big Five personality profile"
                time="Coming later"
              />
            </li>
            <li>
              <CategoryCard
                href="/tests/work-emotion-awareness"
                badge="EQ"
                title="Emotional Intelligence"
                detail="Emotional awareness and regulation"
                time="~2 min live scale"
              />
            </li>
            <li>
              <CategoryCard
                href="/tests"
                badge="Cognitive"
                title="Memory"
                detail="Interactive short-term and visual memory tests"
                time="Coming later"
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
            Train & measure
          </h2>
          <p className="mt-3 max-w-lg text-[15px] leading-6 text-muted">
            Short, focused exercises that measure specific cognitive abilities
            in real time. These are sketched in the product plan; they are not
            in the catalog yet.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game) => (
              <li
                key={game.title}
                className="mm-panel flex items-start gap-3 px-4 py-4"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canvas text-accent">
                  <Bolt />
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{game.title}</p>
                  <p className="mt-0.5 text-sm text-muted">{game.detail}</p>
                </div>
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
              03 — Methodology
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
              title="Percentiles with a disclaimer"
              body="Today we ship development tables with each instrument version. They are not clinical norms and not ranks against other users."
            />
            <MethodPoint
              title="Transparent methodology"
              body="Scoring models live in the catalog files (CTT, sum-correct). A full IQ battery with population norms is the next instrument, not this landing copy."
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
