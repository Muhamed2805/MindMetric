import { describe, expect, it } from "vitest";
import { parseBatteryDefinition, resolveRetestAccess } from "./battery";

function section(position: number, domain: string, formVersionId: string) {
  return { position, domain, formVersionId };
}

describe("parseBatteryDefinition", () => {
  it("orders sections by position", () => {
    const parsed = parseBatteryDefinition(
      {
        engine: "battery-v1",
        sections: [section(2, "gs", "form-b"), section(1, "gf", "form-a")],
      },
      "battery",
    );

    expect(parsed.sections.map((entry) => entry.domain)).toEqual(["gf", "gs"]);
    expect(parsed.retestPolicy).toBeNull();
  });

  it("pins a retest policy when the composition asks for one", () => {
    const parsed = parseBatteryDefinition(
      {
        engine: "battery-v1",
        sections: [section(1, "gf", "form-a")],
        retestPolicy: {
          cooldownMs: 2_592_000_000,
          requiresAlternateForm: true,
        },
      },
      "battery",
    );

    expect(parsed.retestPolicy).toEqual({
      cooldownMs: 2_592_000_000,
      requiresAlternateForm: true,
    });
  });

  it("rejects a gap in positions", () => {
    expect(() =>
      parseBatteryDefinition(
        {
          engine: "battery-v1",
          sections: [section(1, "gf", "form-a"), section(3, "gs", "form-b")],
        },
        "battery",
      ),
    ).toThrow(/contiguous/);
  });

  it("rejects measuring one domain twice", () => {
    expect(() =>
      parseBatteryDefinition(
        {
          engine: "battery-v1",
          sections: [section(1, "gf", "form-a"), section(2, "gf", "form-b")],
        },
        "battery",
      ),
    ).toThrow(/twice/);
  });

  it("rejects a break after the final section", () => {
    expect(() =>
      parseBatteryDefinition(
        {
          engine: "battery-v1",
          sections: [
            {
              ...section(1, "gf", "form-a"),
              breakAfter: true,
              breakMaxMs: 60000,
            },
          ],
        },
        "battery",
      ),
    ).toThrow(/final section/);
  });

  it("rejects a break without a duration", () => {
    expect(() =>
      parseBatteryDefinition(
        {
          engine: "battery-v1",
          sections: [
            { ...section(1, "gf", "form-a"), breakAfter: true },
            section(2, "gs", "form-b"),
          ],
        },
        "battery",
      ),
    ).toThrow(/without breakMaxMs/);
  });
});

describe("resolveRetestAccess", () => {
  const now = new Date("2026-09-14T00:00:00.000Z");
  const yesterday = new Date("2026-09-13T00:00:00.000Z");

  it("lets practice repeat", () => {
    expect(
      resolveRetestAccess({
        practiceOnly: true,
        policy: { cooldownMs: 1, requiresAlternateForm: true },
        lastCompletedAt: yesterday,
        now,
      }).allowed,
    ).toBe(true);
  });

  it("locks a counting attempt when no alternate form exists", () => {
    const access = resolveRetestAccess({
      practiceOnly: false,
      policy: { cooldownMs: 0, requiresAlternateForm: true },
      lastCompletedAt: yesterday,
      now,
    });

    expect(access.allowed).toBe(false);
    expect(access.reason).toMatch(/alternate form/);
  });

  it("unlocks after the cooldown when an alternate form is not required", () => {
    expect(
      resolveRetestAccess({
        practiceOnly: false,
        policy: { cooldownMs: 1_000, requiresAlternateForm: false },
        lastCompletedAt: yesterday,
        now,
      }).allowed,
    ).toBe(true);
  });
});
