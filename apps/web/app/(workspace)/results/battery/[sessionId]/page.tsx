import { Button } from "@mindmetric/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BatteryReportPanel } from "../../../../../components/battery-report";
import { apiGet } from "../../../../../lib/api.server";
import {
  batteryPhaseLabel,
  batteryScoreDisclaimer,
} from "../../../../../lib/battery-copy";
import type { BatterySessionState } from "../../../../../lib/battery-types";
import { minutesFromMs } from "../../../../../lib/format";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export const metadata: Metadata = {
  title: "Battery report",
};

export default async function BatteryResultPage({ params }: PageProps) {
  const { sessionId } = await params;

  let session: BatterySessionState;
  try {
    session = await apiGet<BatterySessionState>(
      `/battery/sessions/${sessionId}`,
    );
  } catch {
    notFound();
  }

  if (session.status !== "completed") {
    redirect(`/run/battery/${session.id}`);
  }

  const elapsedMs =
    session.report?.durationMs ??
    (session.completedAt
      ? new Date(session.completedAt).getTime() -
        new Date(session.startedAt).getTime()
      : 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-mark">
          {batteryPhaseLabel(session.isPracticeMode)}
        </p>
        <h1 className="mt-1 font-serif text-4xl font-medium tracking-tight">
          {session.batteryTitle}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
          Finished in {minutesFromMs(elapsedMs)}. {batteryScoreDisclaimer()}
        </p>
      </div>

      <BatteryReportPanel report={session.report} fallback={session.sections} />

      <div>
        <Button asChild variant="secondary">
          <Link href="/results">All results</Link>
        </Button>
      </div>
    </div>
  );
}
