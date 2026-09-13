import { Button, ErrorState } from "@mindmetric/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { InstrumentCard } from "../../../components/instrument-card";
import { PageIntro } from "../../../components/page-intro";
import { apiGet } from "../../../lib/api.server";
import type {
  AssessmentSummary,
  CatalogInstrument,
} from "../../../lib/assessment-types";
import { firstName, formatDateTime } from "../../../lib/format";
import { getServerSession } from "../../../lib/session";

export const metadata: Metadata = {
  title: "Home",
};

export default async function WorkspaceHomePage() {
  const session = await getServerSession();
  const name = session?.user.name ? firstName(session.user.name) : "there";

  let instruments: CatalogInstrument[] = [];
  let assessments: AssessmentSummary[] = [];
  let loadError: string | null = null;

  try {
    const [catalog, rows] = await Promise.all([
      apiGet<CatalogInstrument[]>("/instruments"),
      apiGet<AssessmentSummary[]>("/assessments"),
    ]);
    instruments = catalog;
    assessments = rows;
  } catch (cause) {
    loadError =
      cause instanceof Error ? cause.message : "Could not load your workspace.";
  }

  const inProgress = assessments.filter((row) => row.status === "in_progress");
  const latestResult = assessments.find(
    (row) => row.status === "completed" && row.score,
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <PageIntro
        kicker="Home"
        title={`Hello, ${name}`}
        description="Continue a scale you started, read the last report, or pick something new from the catalog."
      />
      {loadError ? (
        <ErrorState description={loadError} />
      ) : (
        <>
          {inProgress.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Continue</h2>
              <ul className="flex flex-col gap-3">
                {inProgress.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-3 rounded-lg bg-surface px-5 py-5 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-ink">{row.title}</p>
                      <p className="mt-1 text-sm text-muted">
                        Started {formatDateTime(row.startedAt)}
                      </p>
                    </div>
                    <Button asChild>
                      <Link href={`/run/${row.id}`}>Resume</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {latestResult ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold tracking-tight">
                Latest result
              </h2>
              <Link
                href={`/results/${latestResult.id}`}
                className="block rounded-lg bg-surface px-5 py-5 ring-1 ring-line transition-colors hover:bg-canvas"
              >
                <p className="font-medium text-ink">{latestResult.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {latestResult.score
                    ? `${latestResult.score.raw} / ${latestResult.score.max}`
                    : null}
                  {latestResult.score?.band
                    ? ` · ${latestResult.score.band.label}`
                    : ""}
                  {latestResult.completedAt
                    ? ` · ${formatDateTime(latestResult.completedAt)}`
                    : ""}
                </p>
              </Link>
            </section>
          ) : null}
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-semibold tracking-tight">Catalog</h2>
              <Link
                href="/tests"
                className="text-sm font-medium text-ink underline"
              >
                All tests
              </Link>
            </div>
            {instruments.length === 0 ? (
              <p className="text-sm text-muted">
                No published assessments yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {instruments.map((instrument) => (
                  <li key={instrument.slug}>
                    <InstrumentCard instrument={instrument} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
