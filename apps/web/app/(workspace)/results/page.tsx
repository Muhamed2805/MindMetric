import { Button, EmptyState, ErrorState } from "@mindmetric/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { batteryRawLabel } from "../../../components/battery-report";
import { apiGet } from "../../../lib/api.server";
import type { AssessmentSummary } from "../../../lib/assessment-types";
import type { BatterySessionSummary } from "../../../lib/battery-types";

export const metadata: Metadata = {
  title: "Results",
};

type ResultRow = {
  id: string;
  href: string;
  title: string;
  total: string;
  note: string;
  completedAt: string | null;
};

export default async function ResultsPage() {
  let assessments: AssessmentSummary[] = [];
  let batteries: BatterySessionSummary[] = [];
  let loadError: string | null = null;

  try {
    const [scaleRows, batteryRows] = await Promise.all([
      apiGet<AssessmentSummary[]>("/assessments"),
      apiGet<BatterySessionSummary[]>("/battery/sessions"),
    ]);
    assessments = scaleRows;
    batteries = batteryRows;
  } catch (cause) {
    loadError =
      cause instanceof Error ? cause.message : "Could not load results.";
  }

  const rows: ResultRow[] = [
    ...assessments
      .filter((row) => row.status === "completed")
      .map((row) => ({
        id: row.id,
        href: `/results/${row.id}`,
        title: row.title,
        total: row.score ? `${row.score.raw} / ${row.score.max}` : "—",
        note:
          row.score?.band?.label ??
          (row.score?.percentile != null
            ? `${row.score.percentile}th percentile`
            : "Keyed"),
        completedAt: row.completedAt,
      })),
    ...batteries
      .filter((row) => row.status === "completed")
      .map((row) => ({
        id: row.id,
        href: `/results/battery/${row.id}`,
        title: row.batteryTitle,
        total: batteryRawLabel(row.report),
        note: row.isPracticeMode
          ? "Calibration practice"
          : "Calibration · raw totals",
        completedAt: row.completedAt,
      })),
  ].sort((left, right) => {
    const leftAt = left.completedAt ? new Date(left.completedAt).getTime() : 0;
    const rightAt = right.completedAt
      ? new Date(right.completedAt).getTime()
      : 0;
    return rightAt - leftAt;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-4xl font-medium tracking-tight">
          Results
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          Review keyed totals from finished sessions. Battery figures are raw
          section counts from the calibration phase, not IQ or ranks.
        </p>
      </div>
      {loadError ? (
        <ErrorState description={loadError} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No reports yet"
          description="Finish a scale or the cognitive battery and the total will show up here."
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
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <th className="px-5 py-4 font-medium text-ink" scope="row">
                    <Link href={row.href} className="hover:text-accent">
                      {row.title}
                    </Link>
                  </th>
                  <td className="px-5 py-4 text-accent">{row.total}</td>
                  <td className="px-5 py-4 text-muted">{row.note}</td>
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
