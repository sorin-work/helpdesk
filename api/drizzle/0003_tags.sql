CREATE TABLE "tags" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tags_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_tags" (
	"ticket_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "ticket_tags_ticket_id_tag_id_pk" PRIMARY KEY("ticket_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "ticket_tags" ADD CONSTRAINT "ticket_tags_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_tags" ADD CONSTRAINT "ticket_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_unique" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "ticket_tags_tag_idx" ON "ticket_tags" USING btree ("tag_id");