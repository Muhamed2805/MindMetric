import { Module } from "@nestjs/common";
import { AssessmentModule } from "./assessment/assessment.module";
import { AuthModule } from "./auth/auth.module";
import { CatalogModule } from "./catalog/catalog.module";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { HttpModule } from "./http/http.module";
import { MeModule } from "./me/me.module";

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    HttpModule,
    HealthModule,
    MeModule,
    CatalogModule,
    AssessmentModule,
  ],
})
export class AppModule {}
