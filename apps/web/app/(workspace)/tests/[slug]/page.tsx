import { ErrorState } from "@mindmetric/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StartAssessmentButton } from "../../../../components/start-assessment-button";
import { apiGet } from "../../../../lib/api.server";
import type { InstrumentDetail } from "../../../../lib/assessment-types";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug };
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {detail.title}
        </h1>
        <p className="mt-2 max-w-xl text-base leading-7 text-muted">
          {detail.description}
        </p>
        <p className="mt-3 text-sm text-muted">
          {detail.itemCount} items · version {detail.version}
        </p>
      </div>
      <StartAssessmentButton slug={detail.slug} />
    </div>
  );
}
