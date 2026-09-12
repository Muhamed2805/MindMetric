import { randomUUID } from "node:crypto";
import type { OnModuleInit } from "@nestjs/common";
import { Inject, Injectable } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

@Injectable()
export class FastifyHttpHooks implements OnModuleInit {
  constructor(
    @Inject(HttpAdapterHost) private readonly adapterHost: HttpAdapterHost,
  ) {}

  onModuleInit() {
    const instance =
      this.adapterHost.httpAdapter.getInstance<FastifyInstance>();
    instance.addHook(
      "onRequest",
      async (request: FastifyRequest, reply: FastifyReply) => {
        const incoming = request.headers["x-request-id"];
        const id =
          typeof incoming === "string" && incoming.length > 0
            ? incoming.slice(0, 128)
            : randomUUID();
        request.requestId = id;
        reply.header("x-request-id", id);
      },
    );
    instance.addHook("onSend", async (_request, reply, payload) => {
      reply.header("x-content-type-options", "nosniff");
      reply.header("x-frame-options", "DENY");
      reply.header("referrer-policy", "no-referrer");
      return payload;
    });
  }
}
