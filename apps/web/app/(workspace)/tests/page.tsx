import { ErrorState } from "@mindmetric/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { InstrumentCard } from "../../../components/instrument-card";
import { apiGet } from "../../../lib/api.server";
import type { CatalogInstrument } from "../../../lib/assessment-types";
import type { BatteryOverview } from "../../../lib/battery-types";
import { queryMatchesBrainGames } from "../../../lib/brain-games";
import { minutesFromMs } from "../../../lib/format";
import { CORE_BATTERY_SLUG, isPrimaryScale } from "../../../lib/workspace-nav";

export const metadata: Metadata = {
  title: "Assessments",
};

export default async function TestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim().toLowerCase() ?? "";
  let instruments: CatalogInstrument[] = [];
  let batteries: BatteryOverview[] = [];
  let loadError: string | null = null;

  try {
    const [catalog, core] = await Promise.all([
      apiGet<CatalogInstrument[]>("/instruments"),
      apiGet<BatteryOverview>(`/battery/catalog/${CORE_BATTERY_SLUG}`).catch(
        () => null,
      ),
    ]);
    instruments = catalog.filter((item) => isPrimaryScale(item.slug));
    batteries = core ? [core] : [];
  } catch (cause) {
    loadError =
      cause instanceof Error ? cause.message : "Could not load tests.";
  }

  const visible = query
    ? instruments.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query),
      )
    : instruments;
  const visibleBatteries = query
    ? batteries.filter(
        (entry) =>
          entry.title.toLowerCase().includes(query) ||
          entry.description.toLowerCase().includes(query),
      )
    : batteries;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-4xl font-medium tracking-tight">
          Assessments
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          Focused measures: the core calibration battery, a five-factor
          personality profile, and short work scales. Domain practice forms live
          on Battery. Brain Games are separate and never feed an IQ.
        </p>
      </div>
      {loadError ? (
        <ErrorState description={loadError} />
      ) : visible.length === 0 && visibleBatteries.length === 0 ? (
        query && queryMatchesBrainGames(query) ? (
          <p className="max-w-xl text-sm leading-6 text-muted">
            Memory drills live in Brain Games, not the assessment catalog. They
            never feed the cognitive battery or an IQ.{" "}
            <Link href="/games" className="font-medium text-accent">
              Open Brain Games →
            </Link>
          </p>
        ) : (
          <p className="text-muted">No published assessments match.</p>
        )
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleBatteries.map((entry) => (
            <li key={entry.slug}>
              <Link
                href="/battery"
                className="mm-panel flex h-full flex-col px-5 py-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                  <p className="text-xs text-muted">
                    {minutesFromMs(entry.timedMs)} under a clock
                  </p>
                </div>
                <p className="mt-5 font-serif text-xl font-medium text-ink">
                  {entry.title}
                </p>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted">
                  {entry.description}
                </p>
                <p className="mt-4 text-sm font-medium text-accent">
                  {entry.practiceOnly
                    ? "Open calibration practice →"
                    : "Open calibration battery →"}
                </p>
              </Link>
            </li>
          ))}
          {visible.map((instrument) => (
            <li key={instrument.slug}>
              <InstrumentCard instrument={instrument} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
