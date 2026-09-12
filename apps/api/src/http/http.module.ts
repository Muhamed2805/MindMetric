import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { AppExceptionFilter } from "./app-exception.filter";
import { FastifyHttpHooks } from "./fastify-http.hooks";
import { RateLimitGuard } from "./rate-limit.guard";
import { RateLimitService } from "./rate-limit.service";
import { RequestLogInterceptor } from "./request-log.interceptor";

@Module({
  providers: [
    RateLimitService,
    FastifyHttpHooks,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AppExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLogInterceptor,
    },
  ],
})
export class HttpModule {}
