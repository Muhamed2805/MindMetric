CREATE TABLE "assessment_result" (
	"id" text PRIMARY KEY NOT NULL,
	"assessment_id" text NOT NULL,
	"model" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "assessment_result_assessment_id_unique" UNIQUE("assessment_id")
);
--> statement-breakpoint
ALTER TABLE "assessment_result" ADD CONSTRAINT "assessment_result_assessment_id_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessment"("id") ON DELETE cascade ON UPDATE no action;
