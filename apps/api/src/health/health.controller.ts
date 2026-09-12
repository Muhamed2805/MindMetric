import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import { SkipRateLimit } from "../http/skip-rate-limit.decorator";

@Public()
@SkipRateLimit()
@Controller("health")
export class HealthController {
  @Get()
  check() {
    return { status: "ok" as const };
  }
}
