import { describe, expect, it } from "vitest";
import { API_VERSION } from "./index.js";

describe("API_VERSION", () => {
  it("is v1", () => {
    expect(API_VERSION).toBe("v1");
  });
});
