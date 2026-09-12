import { describe, expect, it } from "vitest";
import { createSlidingWindow } from "./sliding-window";

describe("createSlidingWindow", () => {
  it("allows up to max hits in the window", () => {
    const limiter = createSlidingWindow(1000, 2);
    const first = limiter.hit("a", 1000);
    const second = limiter.hit("a", 1100);
    const third = limiter.hit("a", 1200);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(third.ok).toBe(false);
    expect(third.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets after the window", () => {
    const limiter = createSlidingWindow(1000, 1);
    expect(limiter.hit("a", 0).ok).toBe(true);
    expect(limiter.hit("a", 500).ok).toBe(false);
    expect(limiter.hit("a", 1001).ok).toBe(true);
  });

  it("isolates keys", () => {
    const limiter = createSlidingWindow(1000, 1);
    expect(limiter.hit("a", 0).ok).toBe(true);
    expect(limiter.hit("b", 0).ok).toBe(true);
  });
});
