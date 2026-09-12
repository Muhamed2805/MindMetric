import { Module } from "@nestjs/common";
import { CatalogService } from "./catalog.service";
import { InstrumentsController } from "./instruments.controller";

@Module({
  controllers: [InstrumentsController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
