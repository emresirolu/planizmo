CREATE TYPE "public"."time_block_category" AS ENUM('focus', 'break', 'personal', 'work', 'health', 'planning');--> statement-breakpoint
CREATE TYPE "public"."view_mode" AS ENUM('flow', 'timeline');--> statement-breakpoint
CREATE TABLE "time_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"duration_min" integer DEFAULT 30 NOT NULL,
	"title" text NOT NULL,
	"category" time_block_category DEFAULT 'focus' NOT NULL,
	"source_widget_id" uuid,
	"source_task_id" uuid,
	"completed" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "view_mode" "view_mode" DEFAULT 'flow' NOT NULL;--> statement-breakpoint
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_source_widget_id_widgets_id_fk" FOREIGN KEY ("source_widget_id") REFERENCES "public"."widgets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_source_task_id_tasks_id_fk" FOREIGN KEY ("source_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;