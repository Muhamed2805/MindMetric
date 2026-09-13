import { describe, expect, it, vi } from "vitest";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("reports liveness without touching the database", () => {
    const controller = new HealthController({
      execute: vi.fn(),
    } as never);
    expect(controller.check()).toEqual({ status: "ok" });
  });

  it("reports ready when the database answers", async () => {
    const controller = new HealthController({
      execute: vi.fn().mockResolvedValue(undefined),
    } as never);
    await expect(controller.ready()).resolves.toEqual({
      status: "ok",
      database: "up",
    });
  });
});
