import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from "@nestjs/common";
import { Injectable, Logger } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { finalize } from "rxjs";

@Injectable()
export class RequestLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler) {
    const started = Date.now();
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();

    return next.handle().pipe(
      finalize(() => {
        this.logger.log(
          `${request.method} ${request.url} ${reply.statusCode} ${Date.now() - started}ms ${request.requestId ?? ""}`,
        );
      }),
    );
  }
}
