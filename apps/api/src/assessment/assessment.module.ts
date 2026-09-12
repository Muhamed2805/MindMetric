import { Module } from "@nestjs/common";
import { AssessmentService } from "./assessment.service";
import { AssessmentsController } from "./assessments.controller";

@Module({
  controllers: [AssessmentsController],
  providers: [AssessmentService],
})
export class AssessmentModule {}
