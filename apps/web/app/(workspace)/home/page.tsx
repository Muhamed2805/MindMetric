import { Button, ErrorState } from "@mindmetric/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { batteryRawLabel } from "../../../components/battery-report";
import { apiGet } from "../../../lib/api.server";
import type {
  AssessmentSummary,
  CatalogInstrument,
} from "../../../lib/assessment-types";
import type { BatterySessionSummary } from "../../../lib/battery-types";
import { durationLabel } from "../../../lib/format";
import { profileBuckets } from "../../../lib/workspace-nav";

export const metadata: Metadata = {
  title: "Home",
};

export default async function WorkspaceHomePage() {
  let instruments: CatalogInstrument[] = [];
  let assessments: AssessmentSummary[] = [];
  let batteries: BatterySessionSummary[] = [];
  let loadError: string | null = null;

  try {
    const [catalog, rows, batteryRows] = await Promise.all([
      apiGet<CatalogInstrument[]>("/instruments"),
      apiGet<AssessmentSummary[]>("/assessments"),
      apiGet<BatterySessionSummary[]>("/battery/sessions").catch(() => []),
    ]);
    instruments = catalog;
    assessments = rows;
    batteries = batteryRows;
  } catch (cause) {
    loadError =
      cause instanceof Error ? cause.message : "Could not load your workspace.";
  }

  const inProgress = assessments.filter((row) => row.status === "in_progress");
  const completed = assessments.filter(
    (row) => row.status === "completed" && row.score,
  );
  const continueBattery = batteries.find((row) => row.status === "in_progress");
  const completedBatteries = batteries.filter(
    (row) => row.status === "completed",
  );
  const continueRow = inProgress[0];
  const recent = [
    ...completed.map((row) => ({
      id: row.id,
      href: `/results/${row.id}`,
      title: row.title,
      detail: row.score ? `${row.score.raw} / ${row.score.max}` : "",
      at: row.completedAt,
    })),
    ...completedBatteries.map((row) => ({
      id: row.id,
      href: `/results/battery/${row.id}`,
      title: row.batteryTitle,
      detail: batteryRawLabel(row.report),
      at: row.completedAt,
    })),
  ]
    .sort((left, right) => {
      const leftAt = left.at ? new Date(left.at).getTime() : 0;
      const rightAt = right.at ? new Date(right.at).getTime() : 0;
      return rightAt - leftAt;
    })
    .slice(0, 3);
  const cognitiveSlugs =
    profileBuckets.find((bucket) => bucket.id === "cognitive")?.slugs ?? [];
  const latestCognitive = completed.find((row) =>
    cognitiveSlugs.includes(row.slug),
  );
  const filledBuckets = profileBuckets.filter((bucket) =>
    bucket.slugs.some((slug) => completed.some((row) => row.slug === slug)),
  ).length;
  const completion = Math.round((filledBuckets / profileBuckets.length) * 100);
  const doneSlugs = new Set(completed.map((row) => row.slug));
  const recommended = instruments
    .filter((item) => !doneSlugs.has(item.slug))
    .slice(0, 2);
  const glance = profileBuckets.map((bucket) => {
    const match = completed.find((row) => bucket.slugs.includes(row.slug));
    const percent =
      match?.score && match.score.max > 0
        ? Math.round((match.score.raw / match.score.max) * 100)
        : null;
    return { ...bucket, percent };
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-mark">
          Your MindMetric
        </p>
        <h1 className="mt-1 font-serif text-4xl font-medium tracking-tight">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-muted">
          A clear view of your developing cognitive profile.
        </p>
      </div>
      {loadError ? (
        <ErrorState description={loadError} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-accent px-6 py-6 text-accent-fg">
              <p className="text-[11px] uppercase tracking-widest text-accent-fg/70">
                Latest cognitive score
              </p>
              {latestCognitive?.score ? (
                <>
                  <p className="mt-3 font-serif text-5xl font-medium">
                    {latestCognitive.score.raw}
                    <span className="ml-2 text-xl text-accent-fg/70">
                      / {latestCognitive.score.max}
                    </span>
                  </p>
                  <p className="mt-3 inline-flex rounded-full bg-accent-fg/15 px-3 py-1 text-sm">
                    {latestCognitive.score.percentile !== null
                      ? `${latestCognitive.score.percentile}th percentile`
                      : (latestCognitive.score.band?.label ??
                        latestCognitive.title)}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-3 font-serif text-2xl font-medium">
                    Not scored yet
                  </p>
                  <p className="mt-2 text-sm text-accent-fg/80">
                    The cognitive battery reports section performance only. It
                    is not an IQ until a reference sample exists.
                  </p>
                  <Button
                    asChild
                    className="mt-4 bg-accent-fg text-accent hover:bg-accent-fg/90"
                  >
                    <Link href="/battery">Open the battery</Link>
                  </Button>
                </>
              )}
            </div>
            <div className="mm-panel px-6 py-6">
              <p className="text-sm text-muted">Profile completion</p>
              <p className="mt-2 font-serif text-4xl font-medium text-ink">
                {completion}%
              </p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  style={{ width: `${completion}%` }}
                  className="h-full rounded-full bg-accent"
                />
              </div>
              <p className="mt-3 text-sm text-muted">
                {filledBuckets} of {profileBuckets.length} profile areas have a
                completed scale.
              </p>
            </div>
          </div>
          <div className="mm-panel px-6 py-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-serif text-xl font-medium">
                Your profile at a glance
              </h2>
              <Link href="/account" className="text-sm text-accent">
                View profile →
              </Link>
            </div>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {glance.map((bucket) => (
                <li key={bucket.id}>
                  <p className="text-sm text-ink">{bucket.label}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${bucket.percent ?? 0}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {bucket.percent === null ? "—" : `${bucket.percent}%`}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="mm-panel px-6 py-5">
              <p className="text-[11px] font-medium uppercase tracking-widest text-mark">
                Continue assessment
              </p>
              {continueBattery ? (
                <>
                  <h2 className="mt-2 font-serif text-2xl font-medium">
                    {continueBattery.batteryTitle}
                  </h2>
                  <Button asChild className="mt-5">
                    <Link href={`/run/battery/${continueBattery.id}`}>
                      Continue battery
                    </Link>
                  </Button>
                </>
              ) : continueRow ? (
                <>
                  <h2 className="mt-2 font-serif text-2xl font-medium">
                    {continueRow.title}
                  </h2>
                  <Button asChild className="mt-5">
                    <Link href={`/run/${continueRow.id}`}>
                      Continue assessment
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <h2 className="mt-2 font-serif text-2xl font-medium">
                    Nothing open
                  </h2>
                  <p className="mt-2 text-sm text-muted">
                    Start a published scale when you have a quiet few minutes.
                  </p>
                  <Button asChild className="mt-5">
                    <Link href="/tests">Explore assessments</Link>
                  </Button>
                </>
              )}
            </div>
            <div className="mm-panel px-6 py-5">
              <h2 className="font-serif text-xl font-medium">
                Recommended next assessments
              </h2>
              {recommended.length === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  You have a result on every live scale.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
                  {recommended.map((item) => (
                    <li key={item.slug}>
                      {item.title}
                      {durationLabel(item.estimatedSeconds, item.itemCount)
                        ? ` · ${durationLabel(item.estimatedSeconds, item.itemCount)}`
                        : ""}
                    </li>
                  ))}
                </ul>
              )}
              <Button asChild variant="secondary" className="mt-5">
                <Link href="/tests">Explore assessments</Link>
              </Button>
            </div>
            <div className="mm-panel px-6 py-5">
              <h2 className="font-serif text-xl font-medium">Recent results</h2>
              {recent.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No keyed totals yet.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  {recent.map((row) => (
                    <li key={row.id}>
                      <Link
                        href={row.href}
                        className="text-ink hover:text-accent"
                      >
                        {row.title}
                        {row.detail ? ` · ${row.detail}` : ""}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mm-panel px-6 py-5">
              <h2 className="font-serif text-xl font-medium">
                Quick access to Brain Games
              </h2>
              <p className="mt-2 text-sm text-muted">
                Short drills. They are not part of the cognitive battery.
              </p>
              <Button asChild variant="secondary" className="mt-5">
                <Link href="/games">Open Brain Games</Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
