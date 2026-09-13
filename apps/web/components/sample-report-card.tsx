function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <p className="w-24 shrink-0 text-xs text-muted">{label}</p>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="w-8 text-right text-xs tabular-nums text-muted">{value}</p>
    </div>
  );
}

export function SampleReportCard() {
  return (
    <aside className="mm-panel w-full max-w-sm p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-medium text-accent-fg">
            E
          </span>
          <div>
            <p className="text-sm font-medium text-ink">Eleanor Marsh</p>
            <p className="text-xs text-muted">Assessment profile</p>
          </div>
        </div>
        <span className="rounded-full bg-canvas px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-accent">
          Active
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-canvas px-4 py-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted">
            Estimated IQ
          </p>
          <p className="mt-1 font-serif text-4xl font-medium text-ink">121</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted">
            Percentile
          </p>
          <p className="mt-1 font-serif text-4xl font-medium text-accent">
            92nd
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3">
        <Bar label="Cognitive" value={88} />
        <Bar label="Memory" value={74} />
        <Bar label="Attention" value={81} />
        <Bar label="Personality" value={92} />
      </div>
      <div className="mt-5 flex items-center justify-between text-xs text-muted">
        <p>Profile completion</p>
        <p>3 of 5 done</p>
      </div>
      <div className="mt-2 flex gap-1.5">
        <span className="h-1.5 flex-1 rounded-full bg-accent" />
        <span className="h-1.5 flex-1 rounded-full bg-accent" />
        <span className="h-1.5 flex-1 rounded-full bg-accent" />
        <span className="h-1.5 flex-1 rounded-full bg-line" />
        <span className="h-1.5 flex-1 rounded-full bg-line" />
      </div>
      <p className="mt-4 text-[11px] leading-4 text-mark">
        Illustrative sample. Live reports use your own sessions, not this card.
      </p>
    </aside>
  );
}
