import { ErrorState } from "@mindmetric/ui";
import type { Metadata } from "next";
import { InstrumentCard } from "../../../components/instrument-card";
import { apiGet } from "../../../lib/api.server";
import type { CatalogInstrument } from "../../../lib/assessment-types";

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
  let loadError: string | null = null;

  try {
    instruments = await apiGet<CatalogInstrument[]>("/instruments");
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
      ) : visible.length === 0 ? (
        <p className="text-muted">No published assessments match.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
