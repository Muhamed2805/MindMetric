import type { IncomingHttpHeaders } from "node:http";
import { Injectable } from "@nestjs/common";

@Injectable()
export class SessionService {
  async getSession(headers: IncomingHttpHeaders) {
    const { getAuth } = await import("@mindmetric/auth");
    const { fromNodeHeaders } = await import("better-auth/node");

    return getAuth().api.getSession({
      headers: fromNodeHeaders(headers as IncomingHttpHeaders),
    });
  }
}
