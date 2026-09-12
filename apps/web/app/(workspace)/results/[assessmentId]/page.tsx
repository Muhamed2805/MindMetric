import { Button } from "@mindmetric/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResultScore } from "../../../../components/result-score";
import { apiGet } from "../../../../lib/api.server";
import type { AssessmentSession } from "../../../../lib/assessment-types";

type PageProps = {
  params: Promise<{ assessmentId: string }>;
};

export const metadata: Metadata = {
  title: "Result",
};

export default async function ResultDetailPage({ params }: PageProps) {
  const { assessmentId } = await params;

  let session: AssessmentSession;
  try {
    session = await apiGet<AssessmentSession>(`/assessments/${assessmentId}`);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {session.title}
        </h1>
        <p className="mt-2 text-base leading-7 text-muted">
          {session.status === "completed"
            ? `Instrument version ${session.version}. Reverse-keyed items are recoded before the total.`
            : "This session is still in progress."}
        </p>
      </div>
      {session.status === "completed" && session.score ? (
        <ResultScore score={session.score} items={session.items} />
      ) : (
        <p className="text-sm text-muted">
          {Object.keys(session.answers).length} of {session.items.length} items
          answered
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        {session.status !== "completed" ? (
          <Button asChild>
            <Link href={`/run/${session.id}`}>Continue</Link>
          </Button>
        ) : null}
        <Button asChild variant="secondary">
          <Link href="/results">All results</Link>
        </Button>
      </div>
    </div>
  );
}
