import { Injectable } from "@nestjs/common";
import { createSlidingWindow, rateLimitConfig } from "./sliding-window";

@Injectable()
export class RateLimitService {
  private readonly limiter: ReturnType<typeof createSlidingWindow>;

  constructor() {
    const config = rateLimitConfig();
    this.limiter = createSlidingWindow(config.windowMs, config.max);
  }

  hit(key: string) {
    return this.limiter.hit(key);
  }
}
