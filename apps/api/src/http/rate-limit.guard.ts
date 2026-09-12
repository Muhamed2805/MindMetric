import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import { RateLimitService } from "./rate-limit.service";
import { SKIP_RATE_LIMIT_KEY } from "./skip-rate-limit.decorator";

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(RateLimitService) private readonly limits: RateLimitService,
  ) {}

  canActivate(context: ExecutionContext) {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const key = request.sessionUser?.id ?? `ip:${clientIp(request)}`;
    const decision = this.limits.hit(key);
    if (decision.ok) {
      return true;
    }

    const reply = context.switchToHttp().getResponse<FastifyReply>();
    reply.header("retry-after", String(decision.retryAfterSec));
    throw new HttpException("Too many requests.", HttpStatus.TOO_MANY_REQUESTS);
  }
}

function clientIp(request: FastifyRequest) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return request.ip || "unknown";
}
