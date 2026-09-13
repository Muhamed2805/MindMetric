import { describe, expect, it } from "vitest";
import { useSecureAuthCookies } from "./auth";

describe("useSecureAuthCookies", () => {
  it("is true only for https public origins", () => {
    expect(useSecureAuthCookies("https://app.example.com")).toBe(true);
    expect(useSecureAuthCookies("http://localhost:3000")).toBe(false);
  });
});
