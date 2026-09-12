import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const reply = http.getResponse<FastifyReply>();
    const request = http.getRequest<FastifyRequest>();
    const requestId = request.requestId ?? "";

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message = publicMessage(status, body);
      if (status >= 500) {
        this.logger.error(
          `${request.method} ${request.url} ${status} ${requestId}`,
        );
      }
      return reply.status(status).send({ statusCode: status, message });
    }

    this.logger.error(
      `${request.method} ${request.url} ${HttpStatus.INTERNAL_SERVER_ERROR} ${requestId}`,
      exception instanceof Error ? exception.stack : undefined,
    );
    return reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
    });
  }
}

function publicMessage(status: number, body: string | object) {
  if (status >= 500) {
    return "Internal server error";
  }
  if (typeof body === "string") {
    return body;
  }
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof body.message === "string"
  ) {
    return body.message;
  }
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    Array.isArray(body.message)
  ) {
    return body.message.join(" ");
  }
  return "Request failed";
}
