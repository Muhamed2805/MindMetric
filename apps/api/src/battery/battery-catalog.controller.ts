import { Controller, Get, Inject, Param } from "@nestjs/common";
import { BatteryService } from "./battery.service";

@Controller("battery/catalog")
export class BatteryCatalogController {
  constructor(
    @Inject(BatteryService) private readonly battery: BatteryService,
  ) {}

  @Get(":slug")
  overview(@Param("slug") slug: string) {
    return this.battery.getOverview(slug);
  }
}
