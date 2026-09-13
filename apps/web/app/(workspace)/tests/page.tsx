import { ErrorState } from "@mindmetric/ui";
import type { Metadata } from "next";
import { InstrumentCard } from "../../../components/instrument-card";
import { PageIntro } from "../../../components/page-intro";
import { apiGet } from "../../../lib/api.server";
import type { CatalogInstrument } from "../../../lib/assessment-types";

export const metadata: Metadata = {
  title: "Tests",
};

export default async function TestsPage() {
  let instruments: CatalogInstrument[] = [];
  let loadError: string | null = null;

  try {
    instruments = await apiGet<CatalogInstrument[]>("/instruments");
  } catch (cause) {
    loadError =
      cause instanceof Error ? cause.message : "Could not load tests.";
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageIntro
        kicker="Catalog"
        title="Tests"
        description="Published scales you can take now. Each version is frozen so a later edit cannot change a score you already have."
      />
      {loadError ? (
        <ErrorState description={loadError} />
      ) : instruments.length === 0 ? (
        <p className="text-muted">No published assessments yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {instruments.map((instrument) => (
            <li key={instrument.slug}>
              <InstrumentCard instrument={instrument} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
