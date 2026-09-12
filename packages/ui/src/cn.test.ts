import { describe, expect, it } from "vitest";
import { cn } from "./cn.js";

describe("cn", () => {
  it("keeps the later tailwind class when they conflict", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
