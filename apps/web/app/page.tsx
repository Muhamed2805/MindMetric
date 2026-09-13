import { Button } from "@mindmetric/ui";
import Link from "next/link";
import { InstrumentCard } from "../components/instrument-card";
import { MarketingHeader } from "../components/marketing-header";
import { apiGet } from "../lib/api.server";
import type { CatalogInstrument } from "../lib/assessment-types";
import { getServerSession } from "../lib/session";

export default async function HomePage() {
  const session = await getServerSession();
  let instruments: CatalogInstrument[] = [];

  try {
    instruments = await apiGet<CatalogInstrument[]>("/instruments");
  } catch {
    instruments = [];
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 py-12 md:py-20">
        <div className="flex max-w-xl flex-col gap-5">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            Psychometrics
          </p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            Structured tests for attention, emotion, and work style.
          </h1>
          <p className="text-base leading-7 text-muted md:text-lg">
            Take a published scale, keep a history, and read a keyed total with
            development percentiles. Scores are not clinical diagnoses.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {session ? (
              <Button asChild>
                <Link href="/tests">Open catalog</Link>
              </Button>
            ) : (
              <>
                <Button asChild>
                  <Link href="/register">Create account</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/login">Sign in</Link>
                </Button>
              </>
            )}
          </div>
        </div>
        {instruments.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold tracking-tight">
              In the catalog
            </h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {instruments.map((instrument) => (
                <li key={instrument.slug}>
                  <InstrumentCard instrument={instrument} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
