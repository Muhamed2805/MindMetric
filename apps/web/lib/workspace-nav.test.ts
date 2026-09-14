import { describe, expect, it } from "vitest";
import {
  profileBucketStartHref,
  profileCompletion,
  scoredProfileBuckets,
  workspaceNav,
} from "./workspace-nav";

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

describe("profileCompletion", () => {
  it("does not let Brain Games keep the profile below 100%", () => {
    const done = profileCompletion({
      hasBattery: true,
      hasPersonality: true,
      completedSlugs: ["work-attention", "work-emotion-awareness"],
    });
    expect(scoredProfileBuckets().map((bucket) => bucket.id)).toEqual([
      "cognitive",
      "attention",
      "personality",
      "eq",
    ]);
    expect(done).toEqual({ filled: 4, total: 4, percent: 100 });
  });

  it("counts the battery, not the old timed MCQ, as cognitive", () => {
    expect(
      profileCompletion({
        hasBattery: false,
        hasPersonality: false,
        completedSlugs: ["quick-pattern-reasoning"],
      }).filled,
    ).toBe(0);
  });
});
