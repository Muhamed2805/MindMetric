import { Button, EmptyState, ErrorState } from "@mindmetric/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "../../../components/page-intro";
import { apiGet } from "../../../lib/api.server";
import type { AssessmentSummary } from "../../../lib/assessment-types";
import { formatDateTime } from "../../../lib/format";

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

  const inProgress = rows.filter((row) => row.status === "in_progress");
  const completed = rows.filter((row) => row.status === "completed");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <PageIntro
        kicker="History"
        title="Results"
        description="Finished sessions keep the keyed total for the instrument version you took."
      />
      {loadError ? (
        <ErrorState description={loadError} />
      ) : (
        <>
          {inProgress.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold tracking-tight">
                In progress
              </h2>
              <ul className="flex flex-col gap-3">
                {inProgress.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={`/run/${row.id}`}
                      className="block rounded-lg bg-surface px-5 py-4 ring-1 ring-line transition-colors hover:bg-canvas"
                    >
                      <p className="font-medium text-ink">{row.title}</p>
                      <p className="mt-1 text-sm text-muted">
                        Started {formatDateTime(row.startedAt)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {completed.length === 0 ? (
            <EmptyState
              title="No reports yet"
              description="Finish a scale and the keyed total will show up here."
              action={
                <Button asChild>
                  <Link href="/tests">Browse tests</Link>
                </Button>
              }
            />
          ) : (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold tracking-tight">
                Completed
              </h2>
              <ul className="flex flex-col gap-3">
                {completed.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={`/results/${row.id}`}
                      className="block rounded-lg bg-surface px-5 py-4 ring-1 ring-line transition-colors hover:bg-canvas"
                    >
                      <p className="font-medium text-ink">{row.title}</p>
                      <p className="mt-1 text-sm text-muted">
                        {row.score
                          ? `${row.score.raw} / ${row.score.max}`
                          : `Version ${row.version}`}
                        {row.score?.band ? ` · ${row.score.band.label}` : ""}
                        {row.completedAt
                          ? ` · ${formatDateTime(row.completedAt)}`
                          : ""}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
