import { describe, expect, it } from "vitest";
import { parseBatteryDefinition } from "./battery";

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
