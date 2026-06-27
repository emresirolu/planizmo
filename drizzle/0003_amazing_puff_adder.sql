CREATE TYPE "public"."plan_status" AS ENUM('draft', 'approved');--> statement-breakpoint
CREATE TABLE "week_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"week_start" date NOT NULL,
	"brain_dump_text" text,
	"plan_json" jsonb,
	"status" "plan_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "week_plans" ADD CONSTRAINT "week_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "week_plans_user_week_unq" ON "week_plans" USING btree ("user_id","week_start");