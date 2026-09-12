import { Controller, Get, Inject, Param } from "@nestjs/common";
import { CatalogService } from "./catalog.service";

@Controller("instruments")
export class InstrumentsController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}

  @Get()
  list() {
    return this.catalog.listPublished();
  }

  @Get(":slug")
  get(@Param("slug") slug: string) {
    return this.catalog.getPublishedBySlug(slug);
  }
}
