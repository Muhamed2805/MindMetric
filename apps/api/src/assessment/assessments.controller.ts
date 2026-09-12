import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import type { SessionUser } from "../auth/session-user";
import { AssessmentService } from "./assessment.service";

@Controller("assessments")
export class AssessmentsController {
  constructor(
    @Inject(AssessmentService) private readonly assessments: AssessmentService,
  ) {}

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.assessments.listForUser(user.id);
  }

  @Post()
  start(
    @CurrentUser() user: SessionUser,
    @Body() body: { instrumentSlug?: string },
  ) {
    return this.assessments.start(user.id, String(body.instrumentSlug ?? ""));
  }

  @Get(":id")
  get(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.assessments.getForUser(user.id, id);
  }

  @Post(":id/answers")
  answer(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() body: { itemId?: string; value?: unknown },
  ) {
    return this.assessments.saveAnswer(
      user.id,
      id,
      String(body.itemId ?? ""),
      body.value,
    );
  }

  @Post(":id/complete")
  complete(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.assessments.complete(user.id, id);
  }
}
