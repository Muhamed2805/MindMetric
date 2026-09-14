import { Button } from "@mindmetric/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIntro } from "../../../../components/page-intro";
import { ResultScore } from "../../../../components/result-score";
import { apiGet } from "../../../../lib/api.server";
import type { AssessmentSession } from "../../../../lib/assessment-types";
import {
  FIVE_FACTOR_SLUG,
  hasPersonalityFacets,
} from "../../../../lib/personality";

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
            ? session.kind === "mcq-timed-v1"
              ? `Instrument version ${session.version}. Correct answers inside the time limit count.`
              : hasPersonalityFacets(session.score)
                ? `Instrument version ${session.version}. Five self-report scales. Not a type code and not a diagnosis.`
                : session.slug === FIVE_FACTOR_SLUG
                  ? `Instrument version ${session.version}. This session was scored before trait bars were stored.`
                  : `Instrument version ${session.version}. Reverse-keyed items are recoded before the total.`
            : "This session is still in progress. Resume to finish and score it."
        }
      />
      {completed && session.score ? (
        <div className="mm-panel px-6 py-8">
          <ResultScore
            score={session.score}
            items={session.items}
            slug={session.slug}
          />
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
        {session.slug === FIVE_FACTOR_SLUG ? (
          <Button asChild variant="secondary">
            <Link href="/personality">Personality test</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
