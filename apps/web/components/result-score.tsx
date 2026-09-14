import type {
  AssessmentScore,
  ClientLikertItem,
  ClientMcqItem,
  CttScore,
  SumCorrectScore,
} from "../lib/assessment-types";
import {
  FIVE_FACTOR_SLUG,
  hasPersonalityFacets,
  personalityBandCopy,
  personalityPoles,
} from "../lib/personality";

function Meter({
  label,
  valueLabel,
  percent,
}: {
  label: string;
  valueLabel: string;
  percent: number;
}) {
  const width = Math.min(100, Math.max(0, percent));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-sm text-muted">{valueLabel}</p>
      </div>
      <div className="h-2 overflow-hidden bg-line" aria-hidden="true">
        <div className="h-full bg-accent" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function isSumCorrectScore(score: AssessmentScore): score is SumCorrectScore {
  return score.model === "sum-correct-v1";
}

export function ResultScore({
  score,
  items,
  slug,
}: {
  score: AssessmentScore;
  items: Array<ClientLikertItem | ClientMcqItem>;
  slug?: string;
}) {
  if (isSumCorrectScore(score)) {
    return <McqResult score={score} items={items} />;
  }
  if (hasPersonalityFacets(score)) {
    return <PersonalityResult score={score} />;
  }
  if (slug === FIVE_FACTOR_SLUG) {
    return <LegacyFiveFactorResult />;
  }
  return <LikertResult score={score} items={items} />;
}

function LegacyFiveFactorResult() {
  return (
    <div className="flex flex-col gap-4">
      <p className="font-serif text-2xl font-medium text-ink">
        This report has no trait bars
      </p>
      <p className="text-sm leading-6 text-muted">
        It was scored before the five-factor profile was stored. The overall
        keyed total is not a type, not an IQ, and not the profile we show now.
        Take the test again for Openness through Emotional stability.
      </p>
    </div>
  );
}

function PersonalityResult({ score }: { score: CttScore }) {
  const facets = score.facets ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="font-serif text-2xl font-medium text-ink">
          Your five-factor profile
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Each scale is what you reported after reverse-keyed items were
          recoded. The filled end is the named trait. This is not a type code,
          not a rank against other users, and not a clinical result.
        </p>
      </div>
      {facets.map((facet) => {
        const range = Math.max(1, facet.max - facet.min);
        const poles = personalityPoles(facet.id);
        const copy = personalityBandCopy(facet.id, facet.band?.id);
        return (
          <div key={facet.id} className="flex flex-col gap-3">
            <p className="text-sm font-medium text-ink">{facet.label}</p>
            {poles ? (
              <div className="flex justify-between gap-4 text-xs text-muted">
                <span>{poles.low}</span>
                <span className="text-right">{poles.high}</span>
              </div>
            ) : null}
            <div className="h-2 overflow-hidden bg-line" aria-hidden="true">
              <div
                className="h-full bg-accent"
                style={{
                  width: `${Math.min(100, Math.max(0, ((facet.raw - facet.min) / range) * 100))}%`,
                }}
              />
            </div>
            {copy ? (
              <p className="text-sm leading-6 text-muted">{copy}</p>
            ) : facet.band ? (
              <p className="text-sm leading-6 text-muted">{facet.band.label}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function LikertResult({
  score,
  items,
}: {
  score: CttScore;
  items: Array<ClientLikertItem | ClientMcqItem>;
}) {
  const prompts = Object.fromEntries(
    items.map((item) => [item.id, item.prompt]),
  );
  const range = Math.max(1, score.max - score.min);

  return (
    <div className="flex flex-col gap-8">
      {score.band ? (
        <p className="font-serif text-2xl font-medium text-ink">
          {score.band.label}
        </p>
      ) : null}
      <Meter
        label="Keyed total"
        valueLabel={`${score.raw} of ${score.max}`}
        percent={((score.raw - score.min) / range) * 100}
      />
      <p className="text-sm leading-6 text-muted">
        The report is the keyed total and the band. A development table ships
        with this version; it is not shown as a rank, not a clinical norm, and
        not a comparison with other MindMetric users.
      </p>
      <div>
        <p className="mb-3 text-sm font-medium text-ink">Keyed item scores</p>
        <ul className="flex flex-col gap-3">
          {score.items.map((entry) => {
            const item = items.find((row) => row.id === entry.id);
            const max =
              item && item.type === "likert" ? item.scale.max : score.max;
            const min =
              item && item.type === "likert" ? item.scale.min : score.min;
            const span = Math.max(1, max - min);
            return (
              <li key={entry.id} className="flex flex-col gap-1">
                <p className="text-sm leading-6 text-ink">
                  {prompts[entry.id] ?? entry.id}
                </p>
                <div className="h-1.5 overflow-hidden bg-line">
                  <div
                    className="h-full bg-accent"
                    style={{
                      width: `${((entry.keyed - min) / span) * 100}%`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function McqResult({
  score,
  items,
}: {
  score: SumCorrectScore;
  items: Array<ClientLikertItem | ClientMcqItem>;
}) {
  const prompts = Object.fromEntries(
    items.map((item) => [item.id, item.prompt]),
  );

  return (
    <div className="flex flex-col gap-8">
      {score.band ? (
        <p className="font-serif text-2xl font-medium text-ink">
          {score.band.label}
        </p>
      ) : null}
      <Meter
        label="Correct"
        valueLabel={`${score.raw} of ${score.max}`}
        percent={score.max === 0 ? 0 : (score.raw / score.max) * 100}
      />
      <p className="text-sm leading-6 text-muted">
        Credit is given only for the correct option inside the time limit. This
        set is not an IQ test and not a clinical instrument. The count is a raw
        total, not a rank.
      </p>
      <div>
        <p className="mb-3 text-sm font-medium text-ink">Items</p>
        <ul className="flex flex-col gap-3">
          {score.items.map((entry) => (
            <li key={entry.id} className="text-sm leading-6 text-ink">
              <span className="font-medium">
                {entry.timedOut
                  ? "Timed out"
                  : entry.correct
                    ? "Correct"
                    : "Incorrect"}
              </span>
              {" · "}
              {prompts[entry.id] ?? entry.id}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
