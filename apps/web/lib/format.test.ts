import { describe, expect, it } from "vitest";
import { engineLabel, firstName, minutesLabel } from "./format";

describe("format helpers", () => {
  it("labels the Likert engine for people", () => {
    expect(engineLabel("likert-v1")).toBe("Likert scale");
    expect(engineLabel("mcq-timed-v1")).toBe("mcq-timed-v1");
  });

  it("estimates duration from item count", () => {
    expect(minutesLabel(0)).toBeNull();
    expect(minutesLabel(6)).toBe("About 2 minutes");
  });

  it("uses the first name for the greeting", () => {
    expect(firstName("Ada Lovelace")).toBe("Ada");
  });
});
