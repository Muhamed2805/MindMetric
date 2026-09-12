export type RateLimitDecision = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

export function createSlidingWindow(windowMs: number, max: number) {
  const hits = new Map<string, number[]>();
  let seen = 0;

  function prune(now: number) {
    const cutoff = now - windowMs;
    for (const [key, stamps] of hits) {
      const next = stamps.filter((stamp) => stamp > cutoff);
      if (next.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, next);
      }
    }
  }

  return {
    hit(key: string, now = Date.now()): RateLimitDecision {
      seen += 1;
      if (seen % 200 === 0) {
        prune(now);
      }
      const cutoff = now - windowMs;
      const stamps = (hits.get(key) ?? []).filter((stamp) => stamp > cutoff);
      if (stamps.length >= max) {
        hits.set(key, stamps);
        const oldest = stamps[0] ?? now;
        const retryAfterSec = Math.max(
          1,
          Math.ceil((oldest + windowMs - now) / 1000),
        );
        return { ok: false, remaining: 0, retryAfterSec };
      }
      stamps.push(now);
      hits.set(key, stamps);
      return {
        ok: true,
        remaining: max - stamps.length,
        retryAfterSec: 0,
      };
    },
  };
}

export function rateLimitConfig() {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
  const max = Number(process.env.RATE_LIMIT_MAX ?? 120);
  return {
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60_000,
    max: Number.isFinite(max) && max > 0 ? max : 120,
  };
}
