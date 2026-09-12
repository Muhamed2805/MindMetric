import { describe, expect, it } from "vitest";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("reports ok", () => {
    const controller = new HealthController();
    expect(controller.check()).toEqual({ status: "ok" });
  });
});
