import { Module } from "@nestjs/common";
import { BatteryService } from "./battery.service";
import { BatteryCatalogController } from "./battery-catalog.controller";
import { BatterySessionsController } from "./battery-sessions.controller";

@Module({
  controllers: [BatteryCatalogController, BatterySessionsController],
  providers: [BatteryService],
})
export class BatteryModule {}
