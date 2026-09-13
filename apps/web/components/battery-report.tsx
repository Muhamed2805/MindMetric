import type { BatteryReport, BatterySection } from "../lib/battery-types";
import { domainLabel } from "../lib/format";

export function BatteryReportPanel({
  report,
  fallback,
}: {
  report: BatteryReport | null;
  fallback?: BatterySection[];
}) {
  if (report) {
    return (
      <div className="mm-panel flex flex-col gap-4 p-5">
        {report.sections.map((section) => (
          <div
            key={section.position}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
          >
            <span className="text-ink">{domainLabel(section.domain)}</span>
            <span className="text-right text-sm text-muted">
              <span className="font-serif text-2xl tabular-nums text-ink">
                {section.raw}
              </span>
              <span> / {section.max}</span>
              {section.accuracyOnAttempted !== null
                ? ` · ${section.accuracyOnAttempted}% of attempted`
                : ""}
              {section.status === "expired" ? " · ran out of time" : ""}
              {section.normEligible ? "" : " · outside the reference sample"}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mm-panel flex flex-col gap-3 p-5">
      {(fallback ?? []).map((section) => (
        <div
          key={section.position}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm"
        >
          <span className="text-ink">{domainLabel(section.domain)}</span>
          <span className="text-muted">
            {section.completedItemCount} of {section.scoredItemCount} completed
          </span>
        </div>
      ))}
    </div>
  );
}

export function batteryRawLabel(report: BatteryReport | null) {
  if (!report || report.sections.length === 0) {
    return "Raw totals";
  }
  return report.sections
    .map((section) => `${section.raw}/${section.max}`)
    .join(" · ");
}
