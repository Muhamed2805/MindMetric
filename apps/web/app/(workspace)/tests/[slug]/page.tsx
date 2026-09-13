import { ErrorState } from "@mindmetric/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageIntro } from "../../../../components/page-intro";
import { StartAssessmentButton } from "../../../../components/start-assessment-button";
import { apiGet } from "../../../../lib/api.server";
import type { InstrumentDetail } from "../../../../lib/assessment-types";
import { engineLabel, minutesLabel } from "../../../../lib/format";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const detail = await apiGet<InstrumentDetail>(`/instruments/${slug}`);
    return { title: detail.title };
  } catch {
    return { title: "Test" };
  }
}

export default async function InstrumentPage({ params }: PageProps) {
  const { slug } = await params;

  let detail: InstrumentDetail | null = null;
  let loadError: string | null = null;

  try {
    detail = await apiGet<InstrumentDetail>(`/instruments/${slug}`);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    if (
      message.includes("404") ||
      message.toLowerCase().includes("not found")
    ) {
      notFound();
    }
    loadError = message || "Could not load this test.";
  }

  if (loadError || !detail) {
    return (
      <ErrorState description={loadError ?? "Could not load this test."} />
    );
  }

  const time = minutesLabel(detail.itemCount);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <PageIntro
        kicker={engineLabel(detail.kind)}
        title={detail.title}
        description={detail.description}
      />
      <p className="text-sm text-muted">
        {detail.itemCount} items
        {time ? ` · ${time}` : ""} · version {detail.version}
      </p>
      <p className="max-w-xl text-sm leading-6 text-muted">
        You will answer one statement at a time. Reverse-keyed items are recoded
        when you finish. Percentiles are development tables, not clinical norms.
      </p>
      <StartAssessmentButton slug={detail.slug} />
    </div>
  );
}
