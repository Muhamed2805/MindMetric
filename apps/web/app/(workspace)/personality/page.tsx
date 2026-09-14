import { ErrorState } from "@mindmetric/ui";
import type { Metadata } from "next";
import { StartAssessmentButton } from "../../../components/start-assessment-button";
import { apiGet } from "../../../lib/api.server";
import type { InstrumentDetail } from "../../../lib/assessment-types";
import { durationLabel } from "../../../lib/format";
import { FIVE_FACTOR_SLUG } from "../../../lib/personality";

export const metadata: Metadata = {
  title: "Personality test",
};

const traits = [
  {
    id: "openness",
    label: "Openness",
    detail: "Curiosity, new methods, and interest in ideas.",
  },
  {
    id: "conscientiousness",
    label: "Conscientiousness",
    detail: "Follow-through, order, and how you finish work.",
  },
  {
    id: "extraversion",
    label: "Extraversion",
    detail: "Energy with people versus restoration in quiet.",
  },
  {
    id: "agreeableness",
    label: "Agreeableness",
    detail: "Trust, patience, and how you handle disagreement.",
  },
  {
    id: "stability",
    label: "Emotional stability",
    detail: "How quickly you settle after stress or a mistake.",
  },
];

export default async function PersonalityPage() {
  let detail: InstrumentDetail | null = null;
  try {
    detail = await apiGet<InstrumentDetail>(`/instruments/${FIVE_FACTOR_SLUG}`);
  } catch {
    detail = null;
  }

  if (!detail) {
    return (
      <ErrorState
        title="The personality test is unavailable"
        description="Please try again later."
      />
    );
  }

  const time = durationLabel(detail.estimatedSeconds, detail.itemCount);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-mark">
          Free personality test
        </p>
        <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight md:text-5xl">
          {detail.title}
        </h1>
        <p className="mt-4 max-w-xl text-[17px] leading-7 text-muted">
          {detail.description}
        </p>
      </div>

      <div className="mm-panel flex flex-wrap gap-x-8 gap-y-2 px-5 py-4 text-sm text-muted">
        <span>
          <span className="text-ink">{detail.itemCount}</span> statements
        </span>
        <span>
          <span className="text-ink">{time ?? "A few minutes"}</span>
        </span>
        <span>
          <span className="text-ink">5</span> trait scores
        </span>
      </div>

      <div>
        <h2 className="font-serif text-2xl font-medium tracking-tight">
          What you will see
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          One statement at a time. Disagree or agree, then a profile of five
          bars — not a four-letter type, not a rank against other people, and
          not a clinical finding.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {traits.map((trait) => (
            <li key={trait.id} className="mm-panel px-4 py-4">
              <p className="text-sm font-medium text-ink">{trait.label}</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                {trait.detail}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mm-panel flex flex-col gap-4 px-5 py-5">
        <p className="text-sm leading-6 text-muted">
          Answers are what you report about yourself today. Reverse-keyed items
          are recoded on the server. You can leave and resume an unfinished
          session.
        </p>
        <StartAssessmentButton slug={detail.slug} label="Start the test" />
      </div>
    </div>
  );
}
