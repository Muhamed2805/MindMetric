CREATE TABLE "quality_rule_set" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"engine" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "quality_rule_set_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "quality_rule_version" (
	"id" text PRIMARY KEY NOT NULL,
	"rule_set_id" text NOT NULL,
	"version" integer NOT NULL,
	"status" text NOT NULL,
	"definition" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "quality_rule_version_rule_set_id_version_unique" UNIQUE("rule_set_id","version")
);
--> statement-breakpoint
ALTER TABLE "section_instance" ADD COLUMN "rule_version_id" text;--> statement-breakpoint
ALTER TABLE "section_instance" ADD COLUMN "eligibility_observations" jsonb;--> statement-breakpoint
ALTER TABLE "quality_rule_version" ADD CONSTRAINT "quality_rule_version_rule_set_id_quality_rule_set_id_fk" FOREIGN KEY ("rule_set_id") REFERENCES "public"."quality_rule_set"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_instance" ADD CONSTRAINT "section_instance_rule_version_id_quality_rule_version_id_fk" FOREIGN KEY ("rule_version_id") REFERENCES "public"."quality_rule_version"("id") ON DELETE no action ON UPDATE no action;