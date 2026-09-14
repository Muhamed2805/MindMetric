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
 * Profile and home cognitive surfaces use the core battery only.
 * Domain practice forms are not a substitute.
 */
export function pickLatestCompletedBattery(
  rows: BatterySessionSummary[],
): BatterySessionSummary | null {
  const completed = rows.filter(
    (row) =>
      row.status === "completed" &&
      row.completedAt &&
      row.batterySlug === CORE_BATTERY_SLUG,
  );
  const newest = (left: BatterySessionSummary, right: BatterySessionSummary) =>
    completedAtMs(right) - completedAtMs(left);

  return [...completed].sort(newest)[0] ?? null;
}
