export function SampleReportCard() {
  return (
    <aside className="mm-panel w-full max-w-sm p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">Core cognitive battery</p>
          <p className="text-xs text-muted">Calibration practice</p>
        </div>
        <span className="rounded-full bg-canvas px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-accent">
          S0
        </span>
      </div>
      <ul className="mt-5 flex flex-col gap-3 rounded-xl bg-canvas px-4 py-4 text-sm">
        <li className="flex items-baseline justify-between gap-3">
          <span className="text-muted">Fluid reasoning</span>
          <span className="tabular-nums text-ink">raw / max</span>
        </li>
        <li className="flex items-baseline justify-between gap-3">
          <span className="text-muted">Processing speed</span>
          <span className="tabular-nums text-ink">raw / max</span>
        </li>
        <li className="flex items-baseline justify-between gap-3">
          <span className="text-muted">Quantitative</span>
          <span className="tabular-nums text-ink">raw / max</span>
        </li>
        <li className="flex items-baseline justify-between gap-3">
          <span className="text-muted">Spatial</span>
          <span className="tabular-nums text-ink">raw / max</span>
        </li>
        <li className="flex items-baseline justify-between gap-3">
          <span className="text-muted">Working memory</span>
          <span className="tabular-nums text-ink">raw / max</span>
        </li>
      </ul>
      <p className="mt-4 text-[11px] leading-4 text-mark">
        Illustrative layout. Live reports show your section counts, not an IQ,
        percentile, or confidence interval.
      </p>
    </aside>
  );
}
