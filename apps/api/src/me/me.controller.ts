import { Controller, Get } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import type { SessionUser } from "../auth/session-user";

@Controller("me")
export class MeController {
  @Get()
  me(@CurrentUser() user: SessionUser) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role ?? "user",
    };
  }
}
