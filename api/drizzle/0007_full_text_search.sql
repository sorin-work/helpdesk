ALTER TABLE "tickets" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(subject, ''))) STORED;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(body, ''))) STORED;--> statement-breakpoint
CREATE INDEX "tickets_search_idx" ON "tickets" USING gin ("search");--> statement-breakpoint
CREATE INDEX "messages_search_idx" ON "messages" USING gin ("search");