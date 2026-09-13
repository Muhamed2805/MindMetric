DELETE FROM "assessment" WHERE "user_id" NOT IN (SELECT "id" FROM "public"."user");
--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
