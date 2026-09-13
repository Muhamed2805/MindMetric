import { ErrorState } from "@mindmetric/ui";
import type { Metadata } from "next";
import { StartBatteryButton } from "../../../components/start-battery-button";
import { apiGet } from "../../../lib/api.server";
import type { BatteryOverview } from "../../../lib/battery-types";
import { domainLabel, minutesFromMs } from "../../../lib/format";

export const metadata: Metadata = {
  title: "Cognitive battery",
};

const BATTERY_SLUG = "core-cognitive";

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

export default async function BatteryPage() {
  let overview: BatteryOverview;
  try {
    overview = await apiGet<BatteryOverview>(
      `/battery/catalog/${BATTERY_SLUG}`,
    );
  } catch (cause) {
    return (
      <ErrorState
        title="The battery is unavailable"
        description={
          cause instanceof Error ? cause.message : "Please try again later."
        }
      />
    );
  }

  const totalItems = overview.sections.reduce(
    (sum, section) => sum + section.scoredItemCount,
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-4xl font-medium tracking-tight">
          {overview.title}
        </h1>
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
            <span className="text-ink">{totalItems}</span> scored items
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
                  {section.scoredItemCount} items ·{" "}
                  {minutesFromMs(section.sectionTimeLimitMs)}
                  {note ? ` · ${note}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mm-panel flex flex-col gap-3 p-5 text-sm leading-6 text-muted">
        <h2 className="font-serif text-xl text-ink">
          What you will and will not get
        </h2>
        <p>
          This battery has no reference sample yet, so it reports how you did on
          each section and nothing more. There is no IQ score, no percentile and
          no confidence interval, because with nobody to compare you against
          those numbers would be invented rather than measured.
        </p>
        {overview.practiceOnly ? (
          <p className="text-ink">
            This version is still in preparation, so this run is practice only
            and will not count as an attempt.
          </p>
        ) : null}
        <p>
          Sections run under their own clock and cannot be paused or revisited.
          Set aside {minutesFromMs(overview.timedMs)} of undisturbed time plus a
          few minutes for instructions, and work on a{" "}
          {overview.normReferenceDeviceClass} where you can.
        </p>
      </div>

      <StartBatteryButton slug={overview.slug} />
    </div>
  );
}
