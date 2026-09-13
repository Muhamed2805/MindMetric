import Link from "next/link";
import type { CatalogInstrument } from "../lib/assessment-types";
import { engineLabel, minutesLabel } from "../lib/format";

export function InstrumentCard({
  instrument,
}: {
  instrument: CatalogInstrument;
}) {
  const time = minutesLabel(instrument.itemCount);

  return (
    <Link
      href={`/tests/${instrument.slug}`}
      className="block rounded-lg bg-surface px-5 py-5 ring-1 ring-line transition-colors hover:bg-canvas"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-accent">
        {engineLabel(instrument.kind)}
      </p>
      <p className="mt-2 text-base font-medium text-ink">{instrument.title}</p>
      <p className="mt-1 text-sm leading-6 text-muted">
        {instrument.description}
      </p>
      <p className="mt-3 text-sm text-muted">
        {instrument.itemCount} items
        {time ? ` · ${time}` : ""} · version {instrument.version}
      </p>
    </Link>
  );
}
