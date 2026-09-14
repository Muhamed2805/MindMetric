import { describe, expect, it } from "vitest";
import type { BatterySessionSummary } from "./battery-types";
import { pickLatestCompletedBattery } from "./workspace-home";

function row(
  overrides: Partial<BatterySessionSummary> &
    Pick<BatterySessionSummary, "id" | "batterySlug" | "completedAt">,
): BatterySessionSummary {
  return {
    status: "completed",
    batteryTitle: overrides.batterySlug,
    batteryVersion: 1,
    isPracticeMode: true,
    attemptNumber: 1,
    startedAt: "2026-09-14T10:00:00.000Z",
    report: null,
    ...overrides,
  };
}

describe("pickLatestCompletedBattery", () => {
  it("prefers the core battery over a later domain practice run", () => {
    const picked = pickLatestCompletedBattery([
      row({
        id: "gs",
        batterySlug: "gs-same-different-pilot",
        completedAt: "2026-09-14T12:00:00.000Z",
      }),
      row({
        id: "core",
        batterySlug: "core-cognitive",
        completedAt: "2026-09-14T11:00:00.000Z",
      }),
    ]);

    expect(picked?.id).toBe("core");
  });

  it("falls back to the newest completed domain battery", () => {
    const picked = pickLatestCompletedBattery([
      row({
        id: "gv",
        batterySlug: "gv-rotation-pilot",
        completedAt: "2026-09-14T09:00:00.000Z",
      }),
      row({
        id: "rq",
        batterySlug: "rq-quant-pilot",
        completedAt: "2026-09-14T10:00:00.000Z",
      }),
    ]);

    expect(picked?.id).toBe("rq");
  });

  it("ignores in-progress sessions", () => {
    expect(
      pickLatestCompletedBattery([
        row({
          id: "open",
          batterySlug: "core-cognitive",
          status: "in_progress",
          completedAt: null,
        }),
      ]),
    ).toBeNull();
  });
});
