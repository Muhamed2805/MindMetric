import { describe, expect, it } from "vitest";
import type { BatterySessionSummary } from "./battery-types";
import {
  hasCompletedCoreBattery,
  newestByKey,
  pickLatestCompletedBattery,
} from "./workspace-home";

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

  it("ignores a completed domain practice run", () => {
    expect(
      pickLatestCompletedBattery([
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
      ]),
    ).toBeNull();
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

describe("newestByKey", () => {
  it("keeps one newest row per key so retakes do not hide other scales", () => {
    const rows = newestByKey(
      [
        { id: "p1", key: "five-factor-profile", at: 3 },
        { id: "p0", key: "five-factor-profile", at: 1 },
        { id: "core", key: "core-cognitive", at: 2 },
        { id: "att", key: "work-attention", at: 0 },
      ],
      (row) => row.key,
      (row) => row.at,
    );

    expect(rows.map((row) => row.id)).toEqual(["p1", "core", "att"]);
  });
});

describe("hasCompletedCoreBattery", () => {
  it("does not count a domain pilot as the core battery", () => {
    expect(
      hasCompletedCoreBattery([
        row({
          id: "gs",
          batterySlug: "gs-same-different-pilot",
          completedAt: "2026-09-14T12:00:00.000Z",
        }),
      ]),
    ).toBe(false);
    expect(
      hasCompletedCoreBattery([
        row({
          id: "core",
          batterySlug: "core-cognitive",
          completedAt: "2026-09-14T11:00:00.000Z",
        }),
      ]),
    ).toBe(true);
  });
});
