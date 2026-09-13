import { Module } from "@nestjs/common";
import { BatteryService } from "./battery.service";
import { BatterySessionsController } from "./battery-sessions.controller";

@Module({
  controllers: [BatterySessionsController],
  providers: [BatteryService],
})
export class BatteryModule {}
