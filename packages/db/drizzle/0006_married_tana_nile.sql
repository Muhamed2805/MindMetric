CREATE TABLE "battery" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "battery_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "battery_response" (
	"id" text PRIMARY KEY NOT NULL,
	"item_instance_id" text NOT NULL,
	"code" text NOT NULL,
	"choice_id" text,
	"response_time_ms" integer,
	"client_shown_at" timestamp with time zone,
	"client_first_interaction_at" timestamp with time zone,
	"client_answered_at" timestamp with time zone,
	"server_received_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"payload" jsonb,
	CONSTRAINT "battery_response_item_instance_id_unique" UNIQUE("item_instance_id")
);
--> statement-breakpoint
CREATE TABLE "battery_score" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"aggregation_model" text NOT NULL,
	"quality_rules_version" text NOT NULL,
	"norms_version_id" text NOT NULL,
	"input_digest" text NOT NULL,
	"payload" jsonb NOT NULL,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "battery_score_pins_unique" UNIQUE("session_id","aggregation_model","quality_rules_version","norms_version_id")
);
--> statement-breakpoint
CREATE TABLE "battery_session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"battery_version_id" text NOT NULL,
	"status" text NOT NULL,
	"attempt_number" integer NOT NULL,
	"is_practice_mode" boolean DEFAULT false NOT NULL,
	"administration_context" text NOT NULL,
	"age_years" integer,
	"device_class" text NOT NULL,
	"input_mode" text NOT NULL,
	"viewport_width" integer,
	"viewport_height" integer,
	"locale" text NOT NULL,
	"item_language" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "battery_version" (
	"id" text PRIMARY KEY NOT NULL,
	"battery_id" text NOT NULL,
	"version" integer NOT NULL,
	"status" text NOT NULL,
	"definition" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "battery_version_battery_id_version_unique" UNIQUE("battery_id","version")
);
--> statement-breakpoint
CREATE TABLE "item" (
	"id" text PRIMARY KEY NOT NULL,
	"bank_id" text NOT NULL,
	"domain" text NOT NULL,
	"engine" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_instance" (
	"id" text PRIMARY KEY NOT NULL,
	"section_instance_id" text NOT NULL,
	"item_revision_id" text NOT NULL,
	"position" integer NOT NULL,
	"role" text NOT NULL,
	"presentation" jsonb NOT NULL,
	"item_family_id" text,
	"generator_version" text,
	"seed" text,
	"parameters" jsonb,
	"shown_at" timestamp with time zone,
	"status" text NOT NULL,
	CONSTRAINT "item_instance_section_instance_id_position_unique" UNIQUE("section_instance_id","position")
);
--> statement-breakpoint
CREATE TABLE "item_revision" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"revision" integer NOT NULL,
	"status" text NOT NULL,
	"content" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "item_revision_item_id_revision_unique" UNIQUE("item_id","revision")
);
--> statement-breakpoint
CREATE TABLE "quality_event" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"section_instance_id" text,
	"kind" text NOT NULL,
	"payload" jsonb,
	"occurred_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "section_instance" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"form_version_id" text NOT NULL,
	"domain" text NOT NULL,
	"position" integer NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone,
	"deadline_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"device_norm_eligible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "section_instance_session_id_position_unique" UNIQUE("session_id","position")
);
--> statement-breakpoint
CREATE TABLE "section_score" (
	"id" text PRIMARY KEY NOT NULL,
	"section_instance_id" text NOT NULL,
	"scoring_model" text NOT NULL,
	"quality_rules_version" text NOT NULL,
	"norms_version_id" text NOT NULL,
	"input_digest" text NOT NULL,
	"payload" jsonb NOT NULL,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "section_score_pins_unique" UNIQUE("section_instance_id","scoring_model","quality_rules_version","norms_version_id")
);
--> statement-breakpoint
CREATE TABLE "subtest_form" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"domain" text NOT NULL,
	"engine" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "subtest_form_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "subtest_form_version" (
	"id" text PRIMARY KEY NOT NULL,
	"form_id" text NOT NULL,
	"version" integer NOT NULL,
	"status" text NOT NULL,
	"definition" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "subtest_form_version_form_id_version_unique" UNIQUE("form_id","version")
);
--> statement-breakpoint
ALTER TABLE "battery_response" ADD CONSTRAINT "battery_response_item_instance_id_item_instance_id_fk" FOREIGN KEY ("item_instance_id") REFERENCES "public"."item_instance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battery_score" ADD CONSTRAINT "battery_score_session_id_battery_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."battery_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battery_session" ADD CONSTRAINT "battery_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battery_session" ADD CONSTRAINT "battery_session_battery_version_id_battery_version_id_fk" FOREIGN KEY ("battery_version_id") REFERENCES "public"."battery_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battery_version" ADD CONSTRAINT "battery_version_battery_id_battery_id_fk" FOREIGN KEY ("battery_id") REFERENCES "public"."battery"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_instance" ADD CONSTRAINT "item_instance_section_instance_id_section_instance_id_fk" FOREIGN KEY ("section_instance_id") REFERENCES "public"."section_instance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_instance" ADD CONSTRAINT "item_instance_item_revision_id_item_revision_id_fk" FOREIGN KEY ("item_revision_id") REFERENCES "public"."item_revision"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_revision" ADD CONSTRAINT "item_revision_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_event" ADD CONSTRAINT "quality_event_session_id_battery_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."battery_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_event" ADD CONSTRAINT "quality_event_section_instance_id_section_instance_id_fk" FOREIGN KEY ("section_instance_id") REFERENCES "public"."section_instance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_instance" ADD CONSTRAINT "section_instance_session_id_battery_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."battery_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_instance" ADD CONSTRAINT "section_instance_form_version_id_subtest_form_version_id_fk" FOREIGN KEY ("form_version_id") REFERENCES "public"."subtest_form_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_score" ADD CONSTRAINT "section_score_section_instance_id_section_instance_id_fk" FOREIGN KEY ("section_instance_id") REFERENCES "public"."section_instance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtest_form_version" ADD CONSTRAINT "subtest_form_version_form_id_subtest_form_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."subtest_form"("id") ON DELETE cascade ON UPDATE no action;