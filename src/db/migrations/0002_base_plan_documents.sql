CREATE TABLE "trip_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"kind" text DEFAULT 'base_plan' NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"page_count" integer NOT NULL,
	"day_pages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"data" "bytea" NOT NULL,
	"uploaded_by" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group_votes" ADD COLUMN "day_id" text;--> statement-breakpoint
ALTER TABLE "trip_documents" ADD CONSTRAINT "trip_documents_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_documents" ADD CONSTRAINT "trip_documents_uploaded_by_trip_members_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."trip_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trip_documents_kind_uq" ON "trip_documents" USING btree ("trip_id","kind");--> statement-breakpoint
ALTER TABLE "group_votes" ADD CONSTRAINT "group_votes_day_id_itinerary_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."itinerary_days"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Same lock-down as 0001: no Data API access to the new table (the server connection owns it and bypasses RLS).
ALTER TABLE "trip_documents" ENABLE ROW LEVEL SECURITY;
