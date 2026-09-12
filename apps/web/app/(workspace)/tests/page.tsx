import { ErrorState } from "@mindmetric/ui";
import type { Metadata } from "next";
import Link from "next/link";
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
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Tests</h1>
      {loadError ? (
        <ErrorState description={loadError} />
      ) : instruments.length === 0 ? (
        <p className="text-muted">No published assessments yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {instruments.map((instrument) => (
            <li key={instrument.slug}>
              <Link
                href={`/tests/${instrument.slug}`}
                className="block rounded-md bg-surface px-4 py-4 ring-1 ring-line"
              >
                <p className="font-medium text-ink">{instrument.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {instrument.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
