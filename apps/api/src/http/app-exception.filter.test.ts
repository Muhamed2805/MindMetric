import { HttpException, HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AppExceptionFilter } from "./app-exception.filter";

function host(reply: {
  status: (code: number) => { send: (body: unknown) => unknown };
}) {
  return {
    switchToHttp: () => ({
      getResponse: () => reply,
      getRequest: () => ({
        method: "GET",
        url: "/v1/me",
        requestId: "req-1",
      }),
    }),
  };
}

describe("AppExceptionFilter", () => {
  it("keeps client error messages", () => {
    const filter = new AppExceptionFilter();
    let sent: unknown;
    const reply = {
      status(code: number) {
        return {
          send(body: unknown) {
            sent = { code, body };
            return body;
          },
        };
      },
    };
    filter.catch(
      new HttpException("Too many requests.", HttpStatus.TOO_MANY_REQUESTS),
      host(reply) as never,
    );
    expect(sent).toEqual({
      code: 429,
      body: { statusCode: 429, message: "Too many requests." },
    });
  });

  it("hides unexpected errors", () => {
    const filter = new AppExceptionFilter();
    let sent: unknown;
    const reply = {
      status(code: number) {
        return {
          send(body: unknown) {
            sent = { code, body };
            return body;
          },
        };
      },
    };
    filter.catch(new Error("secret"), host(reply) as never);
    expect(sent).toEqual({
      code: 500,
      body: { statusCode: 500, message: "Internal server error" },
    });
  });
});
