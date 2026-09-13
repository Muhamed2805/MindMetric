import { ErrorState } from "@mindmetric/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { InstrumentCard } from "../../../components/instrument-card";
import { apiGet } from "../../../lib/api.server";
import type { CatalogInstrument } from "../../../lib/assessment-types";
import type { BatteryOverview } from "../../../lib/battery-types";
import { minutesFromMs } from "../../../lib/format";

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
  let battery: BatteryOverview | null = null;
  let loadError: string | null = null;

  try {
    const [catalog, overview] = await Promise.all([
      apiGet<CatalogInstrument[]>("/instruments"),
      apiGet<BatteryOverview>("/battery/catalog/core-cognitive").catch(
        () => null,
      ),
    ]);
    instruments = catalog;
    battery = overview;
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
  const showBattery =
    battery !== null &&
    (query.length === 0 ||
      battery.title.toLowerCase().includes(query) ||
      battery.description.toLowerCase().includes(query));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-4xl font-medium tracking-tight">
          Assessments
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          Focused measures for a more complete picture of how you think.
          Personality and memory batteries are still ahead of the live catalog.
        </p>
      </div>
      {loadError ? (
        <ErrorState description={loadError} />
      ) : visible.length === 0 && !showBattery ? (
        <p className="text-muted">No published assessments match.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {showBattery && battery ? (
            <li>
              <Link
                href="/battery"
                className="mm-panel flex h-full flex-col px-5 py-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                  <p className="text-xs text-muted">
                    {minutesFromMs(battery.timedMs)} under a clock
                  </p>
                </div>
                <p className="mt-5 font-serif text-xl font-medium text-ink">
                  {battery.title}
                </p>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted">
                  {battery.description}
                </p>
                <p className="mt-4 text-sm font-medium text-accent">
                  {battery.practiceOnly
                    ? "Open practice battery →"
                    : "Open cognitive battery →"}
                </p>
              </Link>
            </li>
          ) : null}
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
