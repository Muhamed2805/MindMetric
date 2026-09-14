import { Button, ErrorState } from "@mindmetric/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { batteryRawLabel } from "../../../components/battery-report";
import { PersonalityTraitBars } from "../../../components/personality-trait-bars";
import { apiGet } from "../../../lib/api.server";
import type {
  AssessmentSummary,
  CatalogInstrument,
} from "../../../lib/assessment-types";
import {
  batteryPhaseLabel,
  batteryScoreDisclaimer,
} from "../../../lib/battery-copy";
import type { BatterySessionSummary } from "../../../lib/battery-types";
import { durationLabel } from "../../../lib/format";
import {
  FIVE_FACTOR_SLUG,
  hasPersonalityFacets,
  pickLatestPersonality,
} from "../../../lib/personality";
import {
  hasCompletedCoreBattery,
  pickLatestCompletedBattery,
} from "../../../lib/workspace-home";
import {
  assessmentHref,
  CORE_BATTERY_SLUG,
  profileBucketStartHref,
  profileBuckets,
  profileCompletion,
  recommendedNextSlugs,
} from "../../../lib/workspace-nav";

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
  const latestBattery = pickLatestCompletedBattery(completedBatteries);
  const continueRow = inProgress[0];
  const recent = [
    ...completed.map((row) => ({
      id: row.id,
      href: `/results/${row.id}`,
      title: row.title,
      detail:
        row.slug === FIVE_FACTOR_SLUG
          ? hasPersonalityFacets(row.score)
            ? "Five traits"
            : "Earlier total"
          : row.score
            ? `${row.score.raw} / ${row.score.max}`
            : "",
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
  const doneSlugs = new Set(completed.map((row) => row.slug));
  const bySlug = new Map(instruments.map((item) => [item.slug, item]));
  const recommended = recommendedNextSlugs({
    hasCoreBattery: hasCompletedCoreBattery(completedBatteries),
    catalogSlugs: instruments.map((item) => item.slug),
    doneSlugs,
  }).flatMap((slug) => {
    if (slug === CORE_BATTERY_SLUG) {
      return [
        {
          slug,
          title: "Core cognitive battery",
          href: assessmentHref(slug),
          detail: "Calibration practice",
        },
      ];
    }
    const item = bySlug.get(slug);
    if (!item) {
      return [];
    }
    return [
      {
        slug,
        title: item.title,
        href: assessmentHref(slug),
        detail: durationLabel(item.estimatedSeconds, item.itemCount) ?? null,
      },
    ];
  });
  const latestPersonality = pickLatestPersonality(completed);
  const completion = profileCompletion({
    hasBattery: Boolean(latestBattery),
    hasPersonality: Boolean(latestPersonality),
    completedSlugs: doneSlugs,
  });
  const glance = profileBuckets.map((bucket) => {
    if (bucket.id === "cognitive") {
      return {
        ...bucket,
        detail: latestBattery ? "Raw totals" : null,
        facets: null,
        href: "/battery",
      };
    }
    if (bucket.id === "personality") {
      return {
        ...bucket,
        detail: latestPersonality
          ? hasPersonalityFacets(latestPersonality.score)
            ? "Five traits"
            : "Earlier total"
          : null,
        facets: latestPersonality?.score?.facets ?? null,
        href: latestPersonality
          ? `/results/${latestPersonality.id}`
          : "/personality",
      };
    }
    if (bucket.id === "memory") {
      return {
        ...bucket,
        detail: "Practice",
        facets: null,
        href: "/games",
      };
    }
    const match = completed.find((row) => bucket.slugs.includes(row.slug));
    return {
      ...bucket,
      detail: match?.score?.band?.label ?? (match ? "Report" : null),
      facets: null,
      href: match ? `/results/${match.id}` : profileBucketStartHref(bucket.id),
    };
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
          Raw battery totals when you have them. No IQ or percentile until a
          reference sample exists.
        </p>
      </div>
      {loadError ? (
        <ErrorState description={loadError} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-accent px-6 py-6 text-accent-fg">
              <p className="text-[11px] uppercase tracking-widest text-accent-fg/70">
                Latest battery totals
              </p>
              {latestBattery ? (
                <>
                  <p className="mt-3 font-serif text-2xl font-medium leading-snug">
                    {batteryRawLabel(latestBattery.report)}
                  </p>
                  <p className="mt-3 inline-flex rounded-full bg-accent-fg/15 px-3 py-1 text-sm">
                    {batteryPhaseLabel(latestBattery.isPracticeMode)}
                  </p>
                  <p className="mt-3 text-sm text-accent-fg/80">
                    {batteryScoreDisclaimer()}
                  </p>
                  <Button
                    asChild
                    className="mt-4 bg-accent-fg text-accent hover:bg-accent-fg/90"
                  >
                    <Link href={`/results/battery/${latestBattery.id}`}>
                      View report
                    </Link>
                  </Button>
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
                {completion.percent}%
              </p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  style={{ width: `${completion.percent}%` }}
                  className="h-full rounded-full bg-accent"
                />
              </div>
              <p className="mt-3 text-sm text-muted">
                {completion.filled} of {completion.total} scored profile areas
                have a completed scale. Brain Games do not count.
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
              {glance.map((bucket) => {
                const body = (
                  <>
                    <p className="text-sm text-ink">{bucket.label}</p>
                    {bucket.facets && bucket.facets.length > 0 ? (
                      <div className="mt-2">
                        <PersonalityTraitBars facets={bucket.facets} />
                      </div>
                    ) : null}
                    <p className="mt-1 text-xs text-muted">
                      {bucket.detail ?? "—"}
                    </p>
                  </>
                );
                return (
                  <li key={bucket.id}>
                    {bucket.href ? (
                      <Link
                        href={bucket.href}
                        className="block hover:text-accent"
                      >
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
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
                  You have a result on the core battery and every live scale.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
                  {recommended.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={item.href}
                        className="text-ink hover:text-accent"
                      >
                        {item.title}
                        {item.detail ? ` · ${item.detail}` : ""}
                      </Link>
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
