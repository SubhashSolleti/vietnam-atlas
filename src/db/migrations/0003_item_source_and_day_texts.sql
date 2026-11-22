ALTER TABLE "itinerary_items" ADD COLUMN "source" text DEFAULT 'plan' NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_documents" ADD COLUMN "day_texts" jsonb DEFAULT '[]'::jsonb NOT NULL;