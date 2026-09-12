import { ErrorState } from "@mindmetric/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { apiGet } from "../../../lib/api.server";
import type { AssessmentSummary } from "../../../lib/assessment-types";

export const metadata: Metadata = {
  title: "Results",
};

export default async function ResultsPage() {
  let rows: AssessmentSummary[] = [];
  let loadError: string | null = null;

  try {
    rows = await apiGet<AssessmentSummary[]>("/assessments");
  } catch (cause) {
    loadError =
      cause instanceof Error ? cause.message : "Could not load results.";
  }

  const completed = rows.filter((row) => row.status === "completed");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Results</h1>
      {loadError ? (
        <ErrorState description={loadError} />
      ) : completed.length === 0 ? (
        <p className="text-muted">
          Finished assessments will show up here. Scoring and percentiles come
          next.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {completed.map((row) => (
            <li key={row.id}>
              <Link
                href={`/results/${row.id}`}
                className="block rounded-md bg-surface px-4 py-4 ring-1 ring-line"
              >
                <p className="font-medium text-ink">{row.title}</p>
                <p className="mt-1 text-sm text-muted">
                  Version {row.version}
                  {row.completedAt
                    ? ` · ${new Date(row.completedAt).toLocaleString()}`
                    : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
