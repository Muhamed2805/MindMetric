import type {
  AssessmentScore,
  ClientLikertItem,
  ClientMcqItem,
  CttScore,
  SumCorrectScore,
} from "../lib/assessment-types";

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
}: {
  score: AssessmentScore;
  items: Array<ClientLikertItem | ClientMcqItem>;
}) {
  if (isSumCorrectScore(score)) {
    return <McqResult score={score} items={items} />;
  }
  return <LikertResult score={score} items={items} />;
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
      <Meter
        label="Percent of scale range"
        valueLabel={`${score.pomp}%`}
        percent={score.pomp}
      />
      {score.percentile !== null ? (
        <Meter
          label="Development percentile"
          valueLabel={`${score.percentile}`}
          percent={score.percentile}
        />
      ) : null}
      {score.normsKind === "development" ? (
        <p className="text-sm leading-6 text-muted">
          Percentiles come from a development table shipped with this instrument
          version. They are not clinical norms and not ranks against other
          MindMetric users.
        </p>
      ) : null}
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
      {score.percentile !== null ? (
        <Meter
          label="Development percentile"
          valueLabel={`${score.percentile}`}
          percent={score.percentile}
        />
      ) : null}
      <p className="text-sm leading-6 text-muted">
        Credit is given only for the correct option inside the time limit. This
        set is not an IQ test and not a clinical instrument. Percentiles are
        development tables shipped with the version, not ranks against other
        users.
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
