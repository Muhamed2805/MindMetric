import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LikertRunner } from "../../../components/likert-runner";
import { apiGet } from "../../../lib/api.server";
import type { AssessmentSession } from "../../../lib/assessment-types";

type PageProps = {
  params: Promise<{ assessmentId: string }>;
};

export const metadata: Metadata = {
  title: "Assessment",
};

export default async function RunPage({ params }: PageProps) {
  const { assessmentId } = await params;

  let session: AssessmentSession;
  try {
    session = await apiGet<AssessmentSession>(`/assessments/${assessmentId}`);
  } catch {
    notFound();
  }

  if (session.status === "completed") {
    redirect(`/results/${session.id}`);
  }

  return <LikertRunner initial={session} />;
}
