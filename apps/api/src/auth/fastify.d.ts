import type { SessionUser } from "./session-user";

declare module "fastify" {
  interface FastifyRequest {
    sessionUser?: SessionUser;
  }
}
