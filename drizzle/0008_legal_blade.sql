CREATE TYPE "public"."calendar_event_type" AS ENUM('block', 'event', 'task', 'habit');--> statement-breakpoint
CREATE TYPE "public"."calendar_source" AS ENUM('manual', 'ai');--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"date" date NOT NULL,
	"start_time" time,
	"end_time" time,
	"type" "calendar_event_type" DEFAULT 'event' NOT NULL,
	"source" "calendar_source" DEFAULT 'manual' NOT NULL,
	"linked_widget_id" uuid,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_linked_widget_id_widgets_id_fk" FOREIGN KEY ("linked_widget_id") REFERENCES "public"."widgets"("id") ON DELETE set null ON UPDATE no action;