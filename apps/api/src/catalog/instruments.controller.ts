import { Controller, Get, Inject, Param } from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import { CatalogService } from "./catalog.service";

@Controller("instruments")
export class InstrumentsController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}

  @Public()
  @Get()
  list() {
    return this.catalog.listPublished();
  }

  @Get(":slug")
  get(@Param("slug") slug: string) {
    return this.catalog.getPublishedBySlug(slug);
  }
}
