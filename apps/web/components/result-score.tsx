import type { ClientLikertItem, CttScore } from "../lib/assessment-types";

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
      <div
        className="h-3 overflow-hidden rounded-full bg-line"
        aria-hidden="true"
      >
        <div className="h-full bg-accent" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function ResultScore({
  score,
  items,
}: {
  score: CttScore;
  items: ClientLikertItem[];
}) {
  const prompts = Object.fromEntries(
    items.map((item) => [item.id, item.prompt]),
  );
  const range = Math.max(1, score.max - score.min);

  return (
    <div className="flex flex-col gap-8">
      {score.band ? (
        <p className="text-lg font-medium text-ink">{score.band.label}</p>
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
            const max = item?.scale.max ?? score.max;
            const min = item?.scale.min ?? score.min;
            const span = Math.max(1, max - min);
            return (
              <li key={entry.id} className="flex flex-col gap-1">
                <p className="text-sm leading-6 text-ink">
                  {prompts[entry.id] ?? entry.id}
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-line">
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
