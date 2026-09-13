import type {
  BatteryReport,
  BatteryReportSection,
  BatterySection,
  BatteryWarning,
} from "../lib/battery-types";
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
      <div className="mm-panel flex flex-col gap-5 p-5">
        {reportWarningNotes(report).map((note) => (
          <p key={note} className="text-sm text-muted">
            {note}
          </p>
        ))}
        {report.sections.map((section) => (
          <div key={section.position} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-ink">{domainLabel(section.domain)}</span>
              <span className="text-right text-sm text-muted">
                <span className="font-serif text-2xl tabular-nums text-ink">
                  {section.raw}
                </span>
                <span> / {section.max}</span>
                {section.accuracyOnAttempted !== null
                  ? ` · ${section.accuracyOnAttempted}% of attempted`
                  : ""}
              </span>
            </div>
            {sectionNotes(section).map((note) => (
              <p key={note} className="text-sm text-muted">
                {note}
              </p>
            ))}
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

/** User-facing completion notes. Quality flags live on the report, not here. */
export function sectionNotes(section: BatteryReportSection) {
  const notes: string[] = [];
  if (section.status === "expired") {
    notes.push("The section clock ran out.");
  }
  if ((section.notReached ?? 0) > 0) {
    notes.push(
      section.notReached === 1
        ? "1 item was never shown."
        : `${section.notReached} items were never shown.`,
    );
  }
  if ((section.timedOut ?? 0) > 0) {
    notes.push(
      section.timedOut === 1
        ? "1 item timed out after it was shown."
        : `${section.timedOut} items timed out after they were shown.`,
    );
  }
  if ((section.omitted ?? 0) > 0) {
    notes.push(
      section.omitted === 1
        ? "1 item was left blank."
        : `${section.omitted} items were left blank.`,
    );
  }
  if (section.sectionValid === false) {
    notes.push("This section could not be scored reliably.");
  }
  if (!section.normEligible) {
    notes.push("Kept out of the reference sample.");
  }
  return notes;
}

export function reportWarningNotes(report: BatteryReport) {
  return (report.warnings ?? []).map(warningNote);
}

function warningNote(warning: BatteryWarning) {
  return `${domainLabel(warning.domain)}: ${warningBody(warning)}`;
}

function warningBody(warning: BatteryWarning) {
  if (warning.flag === "viewport_below_minimum") {
    return `Screen was ${warning.measured}; this section needs ${warning.threshold}.`;
  }
  if (warning.flag === "device_class_not_normed") {
    return `Taken on a ${warning.measured}; that device class is not in the reference sample.`;
  }
  if (warning.flag === "rapid_responding") {
    return "Many answers came in unusually quickly, so this section is harder to interpret.";
  }
  if (warning.flag === "excessive_missingness") {
    return "Many items were left unanswered, so this section is harder to interpret.";
  }
  if (warning.flag === "focus_loss") {
    return "Attention left the test several times, so this section is harder to interpret.";
  }
  if (warning.flag === "gs_trial_interrupted") {
    return "A processing-speed trial was interrupted, so that trial is harder to interpret.";
  }
  if (warning.flag === "too_few_responses") {
    return "Too few items were answered to interpret this section reliably.";
  }
  if (warning.flag === "impossible_timing") {
    return "The recorded timing for this section could not be interpreted.";
  }
  return "This section is harder to interpret.";
}
