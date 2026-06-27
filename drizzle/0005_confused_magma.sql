CREATE TYPE "public"."goal_status" AS ENUM('active', 'done', 'paused');--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "raw_text" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "icon" text;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "progress_pct" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "next_step" text;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "status" "goal_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "target_date" date;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "linked_widget_id" uuid;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_linked_widget_id_widgets_id_fk" FOREIGN KEY ("linked_widget_id") REFERENCES "public"."widgets"("id") ON DELETE set null ON UPDATE no action;