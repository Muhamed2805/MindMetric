import { ErrorState } from "@mindmetric/ui";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StartAssessmentButton } from "../../../../components/start-assessment-button";
import { apiGet } from "../../../../lib/api.server";
import type { InstrumentDetail } from "../../../../lib/assessment-types";
import { durationLabel, engineLabel } from "../../../../lib/format";
import { FIVE_FACTOR_SLUG } from "../../../../lib/personality";
import { LEGACY_TIMED_MCQ_SLUG } from "../../../../lib/workspace-nav";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug === FIVE_FACTOR_SLUG) {
    return { title: "Personality" };
  }
  if (slug === LEGACY_TIMED_MCQ_SLUG) {
    return { title: "Cognitive battery" };
  }
  try {
    const detail = await apiGet<InstrumentDetail>(`/instruments/${slug}`);
    return { title: detail.title };
  } catch {
    return { title: "Test" };
  }
}

export default async function InstrumentPage({ params }: PageProps) {
  const { slug } = await params;
  if (slug === FIVE_FACTOR_SLUG) {
    redirect("/personality");
  }
  if (slug === LEGACY_TIMED_MCQ_SLUG) {
    redirect("/battery");
  }

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

  const time = durationLabel(detail.estimatedSeconds, detail.itemCount);
  const intro =
    detail.kind === "mcq-timed-v1"
      ? "Each puzzle has a clock. A late or missing answer scores zero. This is not an IQ test and not a clinical instrument."
      : "You will answer one statement at a time. Reverse-keyed items are recoded when you finish. The report is a keyed total and a band, not a rank against other users.";

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
      <div>
        <p className="text-sm text-muted">
          {engineLabel(detail.kind)} · {detail.itemCount} items
          {time ? ` · ${time}` : ""} · v{detail.version}
        </p>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">
          {detail.title}
        </h1>
        <p className="mt-4 max-w-xl text-[17px] leading-7 text-muted">
          {detail.description}
        </p>
        <p className="mt-8 max-w-xl text-sm leading-7 text-muted">{intro}</p>
      </div>
      <aside className="lg:sticky lg:top-24">
        <StartAssessmentButton slug={detail.slug} />
      </aside>
    </div>
  );
}
