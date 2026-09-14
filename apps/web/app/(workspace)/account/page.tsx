import { Button } from "@mindmetric/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { batteryRawLabel } from "../../../components/battery-report";
import { PersonalityTraitBars } from "../../../components/personality-trait-bars";
import { SignOutButton } from "../../../components/sign-out-button";
import { apiGet } from "../../../lib/api.server";
import type { AssessmentSummary } from "../../../lib/assessment-types";
import {
  batteryPhaseLabel,
  batteryScoreDisclaimer,
} from "../../../lib/battery-copy";
import type { BatterySessionSummary } from "../../../lib/battery-types";
import { pickLatestPersonality } from "../../../lib/personality";
import { getServerSession } from "../../../lib/session";
import {
  hasCompletedCoreBattery,
  pickLatestCompletedBattery,
} from "../../../lib/workspace-home";
import {
  profileBucketStartHref,
  profileBuckets,
  profileCompletion,
} from "../../../lib/workspace-nav";

export const metadata: Metadata = {
  title: "My Profile",
};

export default async function AccountPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  let assessments: AssessmentSummary[] = [];
  let batteries: BatterySessionSummary[] = [];
  try {
    const [rows, batteryRows] = await Promise.all([
      apiGet<AssessmentSummary[]>("/assessments"),
      apiGet<BatterySessionSummary[]>("/battery/sessions").catch(() => []),
    ]);
    assessments = rows;
    batteries = batteryRows;
  } catch {
    assessments = [];
  }

  const completed = assessments.filter(
    (row) => row.status === "completed" && row.score,
  );
  const inProgress = assessments.filter((row) => row.status === "in_progress");
  const latestBattery = pickLatestCompletedBattery(
    batteries.filter((row) => row.status === "completed"),
  );
  const hasCoreBattery = hasCompletedCoreBattery(batteries);
  const personality = pickLatestPersonality(completed);
  const personalityFacets = personality?.score?.facets ?? [];
  const completion = profileCompletion({
    hasBattery: hasCoreBattery,
    hasPersonality: Boolean(personality),
    completedSlugs: completed.map((row) => row.slug),
  });
  const unfinished = profileBuckets.filter(
    (row) =>
      (row.id === "cognitive" && !hasCoreBattery) ||
      (row.id === "personality" && !personality),
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-4xl font-medium tracking-tight">
          My Profile
        </h1>
        <p className="mt-2 text-sm text-muted">
          {session.user.name} · {session.user.email}
        </p>
      </div>
      <div className="mm-panel px-6 py-5">
        <h2 className="font-serif text-xl font-medium">
          Overall profile completion
        </h2>
        <p className="mt-2 font-serif text-4xl font-medium">
          {completion.percent}%
        </p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${completion.percent}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-muted">
          {completion.filled} of {completion.total} scored areas. Brain Games do
          not count.
        </p>
      </div>
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
                The cognitive battery reports section performance only. It is
                not an IQ until a reference sample exists.
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
        <div className="mm-panel px-6 py-5">
          <h2 className="font-serif text-xl font-medium">Personality</h2>
          {personalityFacets.length > 0 ? (
            <>
              <div className="mt-4">
                <PersonalityTraitBars
                  facets={personalityFacets}
                  variant="poles"
                />
              </div>
              <Button asChild variant="secondary" className="mt-5">
                <Link href={`/results/${personality?.id}`}>View report</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted">
                A five-factor self-report. Not a type code and not a diagnosis.
              </p>
              <Button asChild variant="secondary" className="mt-5">
                <Link href="/personality">Take the test</Link>
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="mm-panel px-6 py-5">
        <h2 className="font-serif text-xl font-medium">Other scales</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {profileBuckets
            .filter(
              (row) =>
                row.id === "attention" ||
                row.id === "eq" ||
                row.id === "memory",
            )
            .map((row) => {
              const match = completed.find((entry) =>
                row.slugs.includes(entry.slug),
              );
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                >
                  <span className="text-ink">{row.label}</span>
                  {match ? (
                    <Link href={`/results/${match.id}`} className="text-accent">
                      {match.score?.band?.label ?? "View report"}
                    </Link>
                  ) : (
                    <Link
                      href={profileBucketStartHref(row.id)}
                      className="text-muted hover:text-ink"
                    >
                      {row.id === "memory"
                        ? "Brain Games practice"
                        : "Not started"}
                    </Link>
                  )}
                </li>
              );
            })}
        </ul>
        <p className="mt-4 text-xs leading-5 text-muted">
          Brain Games are drills. They never feed the cognitive battery or an IQ
          score.
        </p>
      </div>
      {inProgress[0] ? (
        <div className="mm-panel px-6 py-5">
          <h2 className="font-serif text-xl font-medium">Unfinished</h2>
          <p className="mt-2 text-sm text-muted">{inProgress[0].title}</p>
          <Button asChild className="mt-4">
            <Link href={`/run/${inProgress[0].id}`}>Continue</Link>
          </Button>
        </div>
      ) : null}
      {unfinished.length > 0 ? (
        <div className="mm-panel px-6 py-5">
          <h2 className="font-serif text-xl font-medium">
            Unfinished sections
          </h2>
          <ul className="mt-3 flex flex-col gap-1 text-sm text-muted">
            {unfinished.map((row) => (
              <li key={row.id}>
                <Link
                  href={profileBucketStartHref(row.id)}
                  className="hover:text-ink"
                >
                  {row.label} · Not started
                </Link>
              </li>
            ))}
          </ul>
          <Button asChild variant="secondary" className="mt-4">
            <Link
              href={profileBucketStartHref(unfinished[0]?.id ?? "cognitive")}
            >
              Complete profile
            </Link>
          </Button>
        </div>
      ) : null}
      <SignOutButton />
    </div>
  );
}
