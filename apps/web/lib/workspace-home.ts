import type { BatterySessionSummary } from "./battery-types";
import { CORE_BATTERY_SLUG } from "./workspace-nav";

function completedAtMs(row: BatterySessionSummary) {
  return row.completedAt ? new Date(row.completedAt).getTime() : 0;
}

export function hasCompletedCoreBattery(rows: BatterySessionSummary[]) {
  return rows.some(
    (row) =>
      row.batterySlug === CORE_BATTERY_SLUG &&
      row.status === "completed" &&
      Boolean(row.completedAt),
  );
}

/**
 * Home's cognitive hero is the core battery when it exists. Domain practice
 * batteries and the old timed MCQ are not a substitute IQ.
 */
export function pickLatestCompletedBattery(
  rows: BatterySessionSummary[],
): BatterySessionSummary | null {
  const completed = rows.filter(
    (row) => row.status === "completed" && row.completedAt,
  );
  const newest = (left: BatterySessionSummary, right: BatterySessionSummary) =>
    completedAtMs(right) - completedAtMs(left);

  const core = completed
    .filter((row) => row.batterySlug === CORE_BATTERY_SLUG)
    .sort(newest);
  if (core[0]) {
    return core[0];
  }

  const other = [...completed].sort(newest);
  return other[0] ?? null;
}
