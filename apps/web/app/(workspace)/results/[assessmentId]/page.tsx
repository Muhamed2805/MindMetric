import { Button } from "@mindmetric/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIntro } from "../../../../components/page-intro";
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

  const completed = session.status === "completed";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <PageIntro
        kicker={completed ? "Report" : "In progress"}
        title={session.title}
        description={
          completed
            ? `Instrument version ${session.version}. Reverse-keyed items are recoded before the total.`
            : "This session is still in progress. Resume to finish and score it."
        }
      />
      {completed && session.score ? (
        <div className="rounded-lg bg-surface px-5 py-6 ring-1 ring-line">
          <ResultScore score={session.score} items={session.items} />
        </div>
      ) : (
        <p className="text-sm text-muted">
          {Object.keys(session.answers).length} of {session.items.length} items
          answered
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        {!completed ? (
          <Button asChild>
            <Link href={`/run/${session.id}`}>Resume</Link>
          </Button>
        ) : null}
        <Button asChild variant="secondary">
          <Link href="/results">All results</Link>
        </Button>
      </div>
    </div>
  );
}
