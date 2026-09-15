import { describe, expect, it } from "vitest";
import {
  isWorkspacePath,
  safeWorkspaceReturnPath,
  WORKSPACE_ROUTE_PREFIXES,
} from "./workspace-guard";

describe("workspace guard", () => {
  it("covers Battery, Personality, and Brain Games with the older workspace routes", () => {
    expect(WORKSPACE_ROUTE_PREFIXES).toEqual([
      "/home",
      "/tests",
      "/battery",
      "/personality",
      "/games",
      "/results",
      "/account",
      "/run",
    ]);
    expect(isWorkspacePath("/battery")).toBe(true);
    expect(isWorkspacePath("/personality")).toBe(true);
    expect(isWorkspacePath("/games/chimp")).toBe(true);
    expect(isWorkspacePath("/run/battery/abc")).toBe(true);
    expect(isWorkspacePath("/")).toBe(false);
    expect(isWorkspacePath("/login")).toBe(false);
  });

  it("returns only a workspace path after sign-in", () => {
    expect(safeWorkspaceReturnPath("/battery")).toBe("/battery");
    expect(safeWorkspaceReturnPath("/games/chimp")).toBe("/games/chimp");
    expect(safeWorkspaceReturnPath("/tests?q=memory")).toBe("/tests?q=memory");
    expect(safeWorkspaceReturnPath("/login")).toBe("/home");
    expect(safeWorkspaceReturnPath("//evil.example")).toBe("/home");
    expect(safeWorkspaceReturnPath("https://evil.example/home")).toBe("/home");
    expect(safeWorkspaceReturnPath("/home/../login")).toBe("/home");
    expect(safeWorkspaceReturnPath(undefined)).toBe("/home");
  });
});
