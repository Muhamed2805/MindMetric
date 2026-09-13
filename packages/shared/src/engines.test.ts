import { describe, expect, it } from "vitest";
import { parseEngineDefinition } from "./engines";
import { LIKERT_ENGINE } from "./likert";

describe("parseEngineDefinition", () => {
  it("rejects an unknown engine", () => {
    expect(() => parseEngineDefinition("iq-v1", { engine: "iq-v1" })).toThrow(
      /Unknown instrument engine/,
    );
  });

  it("rejects a likert payload that does not match the kind", () => {
    expect(() =>
      parseEngineDefinition(LIKERT_ENGINE, {
        engine: LIKERT_ENGINE,
        items: [],
      }),
    ).toThrow(/Invalid likert-v1 definition/);
  });
});
