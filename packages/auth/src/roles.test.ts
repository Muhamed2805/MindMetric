import { describe, expect, it } from "vitest";
import { isAdminRole, isUserRole } from "./roles";

describe("roles", () => {
  it("accepts user and admin", () => {
    expect(isUserRole("user")).toBe(true);
    expect(isUserRole("admin")).toBe(true);
    expect(isUserRole("staff")).toBe(false);
  });

  it("detects admin", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("user")).toBe(false);
  });
});
