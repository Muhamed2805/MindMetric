import { describe, expect, it } from "vitest";
import { durationLabel, engineLabel, firstName, minutesLabel } from "./format";

describe("format helpers", () => {
  it("labels the Likert engine for people", () => {
    expect(engineLabel("likert-v1")).toBe("Likert scale");
    expect(engineLabel("mcq-timed-v1")).toBe("Timed multiple choice");
  });

  it("estimates duration from item count", () => {
    expect(minutesLabel(0)).toBeNull();
    expect(minutesLabel(6)).toBe("About 2 minutes");
    expect(durationLabel(120, 6)).toBe("About 2 minutes");
  });

  it("uses the first name for the greeting", () => {
    expect(firstName("Ada Lovelace")).toBe("Ada");
  });
});
