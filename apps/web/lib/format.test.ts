import { describe, expect, it } from "vitest";
import {
  clockLabel,
  durationLabel,
  engineLabel,
  firstName,
  minutesFromMs,
  minutesLabel,
} from "./format";

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

  it("renders a section clock the way a clock reads", () => {
    expect(clockLabel(125_000)).toBe("2:05");
    expect(clockLabel(-1)).toBe("0:00");
  });

  it("rounds timed work to whole minutes", () => {
    expect(minutesFromMs(30_000)).toBe("1 minute");
    expect(minutesFromMs(300_000)).toBe("5 minutes");
  });
});
