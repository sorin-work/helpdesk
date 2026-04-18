ALTER TABLE "tickets" ADD COLUMN "sla_paused_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "sla_paused_minutes" integer DEFAULT 0 NOT NULL;