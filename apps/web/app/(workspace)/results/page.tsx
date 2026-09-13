import { Button, EmptyState, ErrorState } from "@mindmetric/ui";
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-4xl font-medium tracking-tight">
          Results
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          Review keyed totals from finished sessions. These are development
          scores, not clinical ranks.
        </p>
      </div>
      {loadError ? (
        <ErrorState description={loadError} />
      ) : completed.length === 0 ? (
        <EmptyState
          title="No reports yet"
          description="Finish a scale and the keyed total will show up here."
          action={
            <Button asChild>
              <Link href="/tests">Browse assessments</Link>
            </Button>
          }
        />
      ) : (
        <div className="mm-panel overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="px-5 py-4 text-left font-serif text-xl font-medium text-ink">
              Previous assessment results
            </caption>
            <tbody>
              {completed.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <th className="px-5 py-4 font-medium text-ink" scope="row">
                    <Link href={`/results/${row.id}`} className="hover:text-accent">
                      {row.title}
                    </Link>
                  </th>
                  <td className="px-5 py-4 text-accent">
                    {row.score ? `${row.score.raw} / ${row.score.max}` : "—"}
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {row.score?.band?.label ??
                      (row.score?.percentile != null
                        ? `${row.score.percentile}th percentile`
                        : "Keyed")}
                  </td>
                  <td className="px-5 py-4 text-right text-[#2f6f4e]">
                    Completed
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
