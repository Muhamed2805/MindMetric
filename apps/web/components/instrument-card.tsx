import Link from "next/link";
import type { CatalogInstrument } from "../lib/assessment-types";
import { durationLabel } from "../lib/format";

export function InstrumentCard({
  instrument,
}: {
  instrument: CatalogInstrument;
}) {
  const time = durationLabel(instrument.estimatedSeconds, instrument.itemCount);

  return (
    <Link
      href={`/tests/${instrument.slug}`}
      className="mm-panel flex h-full flex-col px-5 py-5"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
        {time ? <p className="text-xs text-muted">{time}</p> : null}
      </div>
      <p className="mt-5 font-serif text-xl font-medium text-ink">
        {instrument.title}
      </p>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted">
        {instrument.description}
      </p>
      <p className="mt-4 text-sm font-medium text-accent">View assessment →</p>
    </Link>
  );
}
