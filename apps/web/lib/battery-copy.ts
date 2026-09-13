/** S0 public copy. No IQ language, and a later re-score is part of the deal. */

export function batteryPhaseLabel(practice: boolean) {
  return practice ? "Calibration practice" : "Calibration report";
}

export function batteryScoreDisclaimer() {
  return "These are raw section totals, not an IQ. There is no percentile or confidence interval yet. When a reference sample exists, this session can be scored again under those norms.";
}

export function batteryRetestNote(
  practice: boolean,
  policy: { requiresAlternateForm: boolean } | null,
) {
  if (practice) {
    return "This version is still in preparation, so this run is practice and will not count toward a later reference sample.";
  }
  if (policy?.requiresAlternateForm) {
    return "A second counting attempt is locked until an alternate form exists. The first valid attempt is the one kept for calibration.";
  }
  return null;
}
