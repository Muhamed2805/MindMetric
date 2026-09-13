import { ErrorState } from "@mindmetric/ui";
import type { Metadata } from "next";
import { StartBatteryButton } from "../../../components/start-battery-button";
import { apiGet } from "../../../lib/api.server";
import {
  batteryRetestNote,
  batteryScoreDisclaimer,
} from "../../../lib/battery-copy";
import {
  type BatteryAccess,
  type BatteryOverview,
  LISTED_BATTERY_SLUGS,
} from "../../../lib/battery-types";
import { domainLabel, minutesFromMs } from "../../../lib/format";

export const metadata: Metadata = {
  title: "Cognitive battery",
};

const BATTERY_SLUGS = LISTED_BATTERY_SLUGS;

function viewportNote(section: BatteryOverview["sections"][number]) {
  const parts: string[] = [];
  if (section.minViewport) {
    parts.push(
      `needs at least ${section.minViewport.widthPx}×${section.minViewport.heightPx} px`,
    );
  }
  if (section.normIneligibleDeviceClasses.length > 0) {
    parts.push(
      `not normed on ${section.normIneligibleDeviceClasses.join(" or ")}`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function BatteryCard({
  overview,
  access,
}: {
  overview: BatteryOverview;
  access: BatteryAccess | null;
}) {
  const totalItems = overview.sections.reduce(
    (sum, section) => sum + section.scoredItemCount,
    0,
  );
  const unit = overview.sections.every(
    (section) => section.domain === "gs" || section.domain === "gwm",
  )
    ? "scored trials"
    : "scored items";
  const retest = batteryRetestNote(
    overview.practiceOnly,
    overview.retestPolicy,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-serif text-3xl font-medium tracking-tight">
          {overview.title}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          {overview.description}
        </p>
      </div>

      <div className="mm-panel flex flex-col gap-4 p-5">
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span className="text-muted">
            <span className="text-ink">{overview.sections.length}</span>{" "}
            sections
          </span>
          <span className="text-muted">
            <span className="text-ink">{totalItems}</span> {unit}
          </span>
          <span className="text-muted">
            <span className="text-ink">{minutesFromMs(overview.timedMs)}</span>{" "}
            under a clock
          </span>
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-4">
          {overview.sections.map((section) => {
            const note = viewportNote(section);
            return (
              <div
                key={section.position}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm"
              >
                <span className="text-ink">{domainLabel(section.domain)}</span>
                <span className="text-muted">
                  {section.scoredItemCount}{" "}
                  {section.domain === "gs" || section.domain === "gwm"
                    ? "trials"
                    : "items"}{" "}
                  · {minutesFromMs(section.sectionTimeLimitMs)}
                  {section.breakAfter && section.breakMaxMs
                    ? ` · optional ${minutesFromMs(section.breakMaxMs)} break`
                    : ""}
                  {note ? ` · ${note}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mm-panel flex flex-col gap-3 p-5 text-sm leading-6 text-muted">
        <h3 className="font-serif text-xl text-ink">
          What you will and will not get
        </h3>
        <p>{batteryScoreDisclaimer()}</p>
        {retest ? <p className="text-ink">{retest}</p> : null}
        <p>
          Sections run under their own clock and cannot be paused or revisited.
          Set aside {minutesFromMs(overview.timedMs)} of undisturbed time plus a
          few minutes for instructions, and work on a{" "}
          {overview.normReferenceDeviceClass} where you can.
        </p>
      </div>

      <StartBatteryButton slug={overview.slug} access={access} />
    </div>
  );
}

export default async function BatteryPage() {
  const overviews = (
    await Promise.all(
      BATTERY_SLUGS.map((slug) =>
        apiGet<BatteryOverview>(`/battery/catalog/${slug}`).catch(() => null),
      ),
    )
  ).filter((entry): entry is BatteryOverview => entry !== null);
  const accessRows = await Promise.all(
    overviews.map((overview) =>
      apiGet<BatteryAccess>(`/battery/sessions/access/${overview.slug}`).catch(
        () => null,
      ),
    ),
  );
  const accessBySlug = new Map(
    accessRows
      .filter((entry): entry is BatteryAccess => entry !== null)
      .map((entry) => [entry.slug, entry]),
  );

  if (overviews.length === 0) {
    return (
      <ErrorState
        title="The battery is unavailable"
        description="Please try again later."
      />
    );
  }

  return (
    <div className="flex flex-col gap-12">
      <div>
        <h1 className="font-serif text-4xl font-medium tracking-tight">
          Cognitive batteries
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          Calibration phase: raw domain totals and quality notes only. The core
          battery runs all five domains in the locked order. Separate
          single-domain forms stay available as practice.
        </p>
      </div>
      {overviews.map((overview) => (
        <BatteryCard
          key={overview.slug}
          overview={overview}
          access={accessBySlug.get(overview.slug) ?? null}
        />
      ))}
    </div>
  );
}
