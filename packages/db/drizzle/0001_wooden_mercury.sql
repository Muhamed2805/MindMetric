CREATE TABLE "assessment" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"instrument_version_id" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "assessment_answer" (
	"id" text PRIMARY KEY NOT NULL,
	"assessment_id" text NOT NULL,
	"item_id" text NOT NULL,
	"value" jsonb NOT NULL,
	"answered_at" timestamp with time zone NOT NULL,
	CONSTRAINT "assessment_answer_assessment_id_item_id_unique" UNIQUE("assessment_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "instrument" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "instrument_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "instrument_version" (
	"id" text PRIMARY KEY NOT NULL,
	"instrument_id" text NOT NULL,
	"version" integer NOT NULL,
	"status" text NOT NULL,
	"definition" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_instrument_version_id_instrument_version_id_fk" FOREIGN KEY ("instrument_version_id") REFERENCES "public"."instrument_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answer" ADD CONSTRAINT "assessment_answer_assessment_id_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_version" ADD CONSTRAINT "instrument_version_instrument_id_instrument_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instrument"("id") ON DELETE cascade ON UPDATE no action;