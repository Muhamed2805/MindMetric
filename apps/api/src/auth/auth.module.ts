import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { SessionGuard } from "./session.guard";
import { SessionService } from "./session.service";

@Module({
  providers: [
    SessionService,
    {
      provide: APP_GUARD,
      useClass: SessionGuard,
    },
  ],
  exports: [SessionService],
})
export class AuthModule {}
