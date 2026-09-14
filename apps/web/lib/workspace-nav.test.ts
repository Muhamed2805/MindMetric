import { describe, expect, it } from "vitest";
import { profileBucketStartHref, workspaceNav } from "./workspace-nav";

describe("workspaceNav", () => {
  it("places personality immediately left of Brain Games", () => {
    const labels = workspaceNav.map((item) => item.label);
    expect(labels.indexOf("Personality")).toBe(
      labels.indexOf("Brain Games") - 1,
    );
    expect(labels.indexOf("Battery")).toBe(labels.indexOf("Personality") - 1);
    expect(
      workspaceNav.find((item) => item.label === "Personality")?.href,
    ).toBe("/personality");
  });
});

describe("profileBucketStartHref", () => {
  it("sends memory to Brain Games, not the cognitive battery", () => {
    expect(profileBucketStartHref("memory")).toBe("/games");
    expect(profileBucketStartHref("cognitive")).toBe("/battery");
    expect(profileBucketStartHref("personality")).toBe("/personality");
  });
});

describe("workspaceNav", () => {
  it("places personality immediately left of Brain Games", () => {
    const labels = workspaceNav.map((item) => item.label);
    expect(labels.indexOf("Personality")).toBe(
      labels.indexOf("Brain Games") - 1,
    );
    expect(labels.indexOf("Battery")).toBe(labels.indexOf("Personality") - 1);
    expect(
      workspaceNav.find((item) => item.label === "Personality")?.href,
    ).toBe("/personality");
  });
});
