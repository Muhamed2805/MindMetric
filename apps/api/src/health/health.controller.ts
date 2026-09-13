import type { Database } from "@mindmetric/db";
import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from "@nestjs/common";
import { sql } from "drizzle-orm";
import { Public } from "../auth/public.decorator";
import { DATABASE } from "../database/database.module";
import { SkipRateLimit } from "../http/skip-rate-limit.decorator";

@Public()
@SkipRateLimit()
@Controller("health")
export class HealthController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @Get()
  check() {
    return { status: "ok" as const };
  }

  @Get("ready")
  async ready() {
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      throw new ServiceUnavailableException("Database is not ready.");
    }
    return { status: "ok" as const, database: "up" as const };
  }
}
