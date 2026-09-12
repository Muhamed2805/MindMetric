import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { MeModule } from "./me/me.module";

@Module({
  imports: [AuthModule, HealthModule, MeModule],
})
export class AppModule {}
