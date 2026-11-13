CREATE TABLE "accommodations" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"destination_id" text,
	"name" text NOT NULL,
	"type" text DEFAULT 'airbnb' NOT NULL,
	"check_in" text NOT NULL,
	"check_out" text NOT NULL,
	"cost_vnd" bigint DEFAULT 0 NOT NULL,
	"cost_mode" text DEFAULT 'total' NOT NULL,
	"participants" jsonb,
	"status" text DEFAULT 'idea' NOT NULL,
	"url" text,
	"notes" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "acc_dates_ck" CHECK (check_out > check_in),
	CONSTRAINT "acc_cost_ck" CHECK (cost_vnd >= 0)
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"destination_id" text NOT NULL,
	"attraction_id" text,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"price_tier" text NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"what_you_do" jsonb NOT NULL,
	"steps" jsonb NOT NULL,
	"duration_bucket" text NOT NULL,
	"duration_text" text NOT NULL,
	"duration_hours" double precision NOT NULL,
	"difficulty" text NOT NULL,
	"intensity" integer NOT NULL,
	"min_age" text,
	"skills" text NOT NULL,
	"safety" jsonb NOT NULL,
	"availability" text NOT NULL,
	"months" text NOT NULL,
	"december_status" text NOT NULL,
	"december_note" text NOT NULL,
	"weather_dependent" boolean NOT NULL,
	"min_participants" text,
	"suitability" jsonb NOT NULL,
	"group_note" text NOT NULL,
	"booking" text NOT NULL,
	"cancellation" text,
	"bring" jsonb NOT NULL,
	"wear" jsonb NOT NULL,
	"transport" text NOT NULL,
	"accessibility" text NOT NULL,
	"provider_links" jsonb NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "activity_alternatives" (
	"activity_id" text NOT NULL,
	"alternative_id" text NOT NULL,
	"type" text NOT NULL,
	CONSTRAINT "activity_alternatives_activity_id_alternative_id_type_pk" PRIMARY KEY("activity_id","alternative_id","type")
);
--> statement-breakpoint
CREATE TABLE "activity_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"description" text,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "activity_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "activity_category_links" (
	"activity_id" text NOT NULL,
	"category_id" text NOT NULL,
	CONSTRAINT "activity_category_links_activity_id_category_id_pk" PRIMARY KEY("activity_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "activity_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"activity_id" text NOT NULL,
	"min_vnd" bigint NOT NULL,
	"max_vnd" bigint NOT NULL,
	"unit" text NOT NULL,
	"basis" text NOT NULL,
	"status" text NOT NULL,
	"audience" text DEFAULT 'adult' NOT NULL,
	"includes" jsonb NOT NULL,
	"excludes" jsonb NOT NULL,
	"extras" jsonb NOT NULL,
	"validity" text,
	"unit_capacity" integer,
	"ticket_bundle" text,
	"is_current" boolean DEFAULT true NOT NULL,
	"verified_at" text,
	"created_at" text NOT NULL,
	CONSTRAINT "prices_range_ck" CHECK (min_vnd >= 0 AND max_vnd >= min_vnd)
);
--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor_name" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"summary" text NOT NULL,
	"diff" jsonb,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attractions" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"destination_id" text NOT NULL,
	"name" text NOT NULL,
	"local_name" text,
	"kind" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"description" text NOT NULL,
	"what_to_see" jsonb NOT NULL,
	"what_to_do" jsonb NOT NULL,
	"opening_hours_text" text NOT NULL,
	"opening_hours_status" text NOT NULL,
	"fee_text" text NOT NULL,
	"fee_min_vnd" bigint,
	"fee_max_vnd" bigint,
	"fee_status" text NOT NULL,
	"visit_duration" text NOT NULL,
	"accessibility" text NOT NULL,
	"distance_from_centre" text NOT NULL,
	"seasonality" text NOT NULL,
	"official_url" text,
	"booking" text NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "budget_categories" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"budget_per_day" integer,
	"balanced_per_day" integer,
	"comfortable_per_day" integer,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_progress" (
	"user_id" text NOT NULL,
	"item_id" text NOT NULL,
	"done_at" text NOT NULL,
	CONSTRAINT "checklist_progress_user_id_item_id_pk" PRIMARY KEY("user_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"candidate_id" text NOT NULL,
	"member_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" text NOT NULL,
	"deleted_at" text
);
--> statement-breakpoint
CREATE TABLE "comparisons" (
	"user_id" text NOT NULL,
	"activity_id" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "comparisons_user_id_activity_id_pk" PRIMARY KEY("user_id","activity_id")
);
--> statement-breakpoint
CREATE TABLE "destination_relationships" (
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"distance_km" integer,
	"travel" text NOT NULL,
	CONSTRAINT "destination_relationships_from_id_to_id_pk" PRIMARY KEY("from_id","to_id")
);
--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"local_name" text,
	"kind" text NOT NULL,
	"region_id" text NOT NULL,
	"parent_id" text,
	"province" text NOT NULL,
	"former_province" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"tagline" text NOT NULL,
	"summary" text NOT NULL,
	"intro" text NOT NULL,
	"why_special" text NOT NULL,
	"why_visit" jsonb NOT NULL,
	"unique_text" text NOT NULL,
	"ideal_for" jsonb NOT NULL,
	"days_min" integer NOT NULL,
	"days_max" integer NOT NULL,
	"travel_style" text NOT NULL,
	"spending_level" integer NOT NULL,
	"adventure_level" integer NOT NULL,
	"popularity" integer DEFAULT 50 NOT NULL,
	"highlights" jsonb NOT NULL,
	"months" text NOT NULL,
	"weather" text NOT NULL,
	"december_note" text NOT NULL,
	"transport_hubs" jsonb NOT NULL,
	"food" jsonb NOT NULL,
	"nightlife" jsonb NOT NULL,
	"practical" jsonb NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "entity_media" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"media_id" text NOT NULL,
	"role" text DEFAULT 'gallery' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_organisers" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"city" text NOT NULL,
	"description" text NOT NULL,
	"organiser" text NOT NULL,
	"url" text,
	"how_to_engage" text NOT NULL,
	"cadence" text NOT NULL,
	"price" text NOT NULL,
	"status" text NOT NULL,
	"publish_status" text DEFAULT 'published' NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "event_organisers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"category_slug" text NOT NULL,
	"label" text NOT NULL,
	"amount_vnd" bigint NOT NULL,
	"cost_mode" text DEFAULT 'total' NOT NULL,
	"participants" jsonb,
	"destination_id" text,
	"date" text,
	"is_quote" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"type" text NOT NULL,
	"page" text,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"candidate_id" text NOT NULL,
	"member_id" text NOT NULL,
	"vote" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guide_sections" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"letter" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"icon" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "guide_sections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "itinerary_days" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"date" text NOT NULL,
	"destination_id" text,
	"title" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "itinerary_items" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"day_id" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"type" text NOT NULL,
	"activity_id" text,
	"transport_leg_id" text,
	"accommodation_id" text,
	"title" text NOT NULL,
	"start_time" text,
	"duration_min" integer,
	"cost_vnd" bigint DEFAULT 0 NOT NULL,
	"cost_mode" text DEFAULT 'per_person' NOT NULL,
	"participants" jsonb,
	"notes" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"src" text NOT NULL,
	"width" integer,
	"height" integer,
	"alt" text NOT NULL,
	"title" text,
	"author" text,
	"license" text,
	"license_url" text,
	"source_url" text,
	"representative" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_blobs" (
	"name" text PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "networking_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"role" text,
	"met_at" text,
	"notes" text,
	"follow_up_date" text,
	"followed_up" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preparation_checklists" (
	"id" text PRIMARY KEY NOT NULL,
	"list" text NOT NULL,
	"group_slug" text NOT NULL,
	"label" text NOT NULL,
	"detail" text,
	"due_days_before" integer,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_events" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"organiser_id" text,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"city" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"venue" text NOT NULL,
	"price" text NOT NULL,
	"registration_url" text NOT NULL,
	"description" text NOT NULL,
	"organiser" text NOT NULL,
	"last_verified" text NOT NULL,
	"publish_status" text DEFAULT 'published' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "professional_events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"climate" text NOT NULL,
	"highlights" jsonb NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"image_query" text,
	CONSTRAINT "regions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"activity_id" text NOT NULL,
	"user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"body" text NOT NULL,
	"visited_on" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "reviews_rating_ck" CHECK (rating BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" text NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "source_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"checked" text NOT NULL,
	"status" text NOT NULL,
	"confidence" text NOT NULL,
	"verified_at" text NOT NULL,
	"verified_by" text
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"publisher" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transport_legs" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"from_destination_id" text,
	"to_destination_id" text,
	"from_label" text NOT NULL,
	"to_label" text NOT NULL,
	"mode" text NOT NULL,
	"depart_at" text,
	"arrive_at" text,
	"duration_min" integer,
	"cost_vnd" bigint DEFAULT 0 NOT NULL,
	"cost_mode" text DEFAULT 'per_person' NOT NULL,
	"participants" jsonb,
	"overnight" boolean DEFAULT false NOT NULL,
	"luggage_note" text,
	"booking_ref" text,
	"is_fixed" boolean DEFAULT false NOT NULL,
	"is_international" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'idea' NOT NULL,
	"notes" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "legs_times_ck" CHECK (depart_at IS NULL OR arrive_at IS NULL OR arrive_at > depart_at),
	CONSTRAINT "legs_cost_ck" CHECK (cost_vnd >= 0)
);
--> statement-breakpoint
CREATE TABLE "travel_guides" (
	"id" text PRIMARY KEY NOT NULL,
	"section_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"summary" text NOT NULL,
	"body" text NOT NULL,
	"key_facts" jsonb NOT NULL,
	"warnings" jsonb NOT NULL,
	"last_verified" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"activity_id" text NOT NULL,
	"added_by" text,
	"status" text DEFAULT 'discussion' NOT NULL,
	"participation" text DEFAULT 'optional' NOT NULL,
	"participants" jsonb,
	"agreed_price_vnd" bigint,
	"price_is_quote" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_members" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"user_id" text,
	"display_name" text NOT NULL,
	"avatar_color" text DEFAULT '#377A61' NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"traveller_type" text DEFAULT 'solo' NOT NULL,
	"couple_group" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"joined_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_preferences" (
	"member_id" text PRIMARY KEY NOT NULL,
	"interests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preferred_destinations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"adventure_tolerance" integer DEFAULT 3 NOT NULL,
	"fitness" integer DEFAULT 3 NOT NULL,
	"food_preferences" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"accommodation" text DEFAULT 'shared_property' NOT NULL,
	"nightlife" integer DEFAULT 3 NOT NULL,
	"budget_inr" integer,
	"free_vs_paid" integer DEFAULT 3 NOT NULL,
	"avoid" text,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"travellers_count" integer NOT NULL,
	"budget_min_inr" integer,
	"budget_max_inr" integer,
	"budget_target_inr" integer,
	"currency" text DEFAULT 'INR' NOT NULL,
	"scenario" text DEFAULT 'balanced' NOT NULL,
	"vote_privacy" text DEFAULT 'named' NOT NULL,
	"invite_code" text NOT NULL,
	"description" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "trips_dates_ck" CHECK (end_date >= start_date),
	CONSTRAINT "trips_budget_ck" CHECK (budget_min_inr IS NULL OR budget_max_inr IS NULL OR budget_min_inr <= budget_max_inr),
	CONSTRAINT "trips_travellers_ck" CHECK (travellers_count BETWEEN 1 AND 30)
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"headline" text,
	"introduction" text,
	"linkedin_url" text,
	"interests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"password_hash" text,
	"display_name" text NOT NULL,
	"avatar_color" text DEFAULT '#377A61' NOT NULL,
	"role" text DEFAULT 'visitor' NOT NULL,
	"is_guest" boolean DEFAULT true NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"disabled_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"state" text DEFAULT 'wishlist' NOT NULL,
	"priority" integer DEFAULT 2 NOT NULL,
	"note" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accommodations" ADD CONSTRAINT "accommodations_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accommodations" ADD CONSTRAINT "accommodations_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_alternatives" ADD CONSTRAINT "activity_alternatives_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_alternatives" ADD CONSTRAINT "activity_alternatives_alternative_id_activities_id_fk" FOREIGN KEY ("alternative_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_category_links" ADD CONSTRAINT "activity_category_links_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_category_links" ADD CONSTRAINT "activity_category_links_category_id_activity_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."activity_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_prices" ADD CONSTRAINT "activity_prices_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attractions" ADD CONSTRAINT "attractions_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_progress" ADD CONSTRAINT "checklist_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_progress" ADD CONSTRAINT "checklist_progress_item_id_preparation_checklists_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."preparation_checklists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_candidate_id_trip_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."trip_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_member_id_trip_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."trip_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destination_relationships" ADD CONSTRAINT "destination_relationships_from_id_destinations_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destination_relationships" ADD CONSTRAINT "destination_relationships_to_id_destinations_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_media" ADD CONSTRAINT "entity_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_slug_budget_categories_slug_fk" FOREIGN KEY ("category_slug") REFERENCES "public"."budget_categories"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_votes" ADD CONSTRAINT "group_votes_candidate_id_trip_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."trip_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_votes" ADD CONSTRAINT "group_votes_member_id_trip_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."trip_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_days" ADD CONSTRAINT "itinerary_days_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_days" ADD CONSTRAINT "itinerary_days_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_day_id_itinerary_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."itinerary_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_transport_leg_id_transport_legs_id_fk" FOREIGN KEY ("transport_leg_id") REFERENCES "public"."transport_legs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_accommodation_id_accommodations_id_fk" FOREIGN KEY ("accommodation_id") REFERENCES "public"."accommodations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "networking_contacts" ADD CONSTRAINT "networking_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_events" ADD CONSTRAINT "professional_events_organiser_id_event_organisers_id_fk" FOREIGN KEY ("organiser_id") REFERENCES "public"."event_organisers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_verifications" ADD CONSTRAINT "source_verifications_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_legs" ADD CONSTRAINT "transport_legs_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_legs" ADD CONSTRAINT "transport_legs_from_destination_id_destinations_id_fk" FOREIGN KEY ("from_destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_legs" ADD CONSTRAINT "transport_legs_to_destination_id_destinations_id_fk" FOREIGN KEY ("to_destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_guides" ADD CONSTRAINT "travel_guides_section_id_guide_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."guide_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_candidates" ADD CONSTRAINT "trip_candidates_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_candidates" ADD CONSTRAINT "trip_candidates_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_candidates" ADD CONSTRAINT "trip_candidates_added_by_trip_members_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."trip_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_preferences" ADD CONSTRAINT "trip_preferences_member_id_trip_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."trip_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "acc_trip_idx" ON "accommodations" USING btree ("trip_id");--> statement-breakpoint
CREATE UNIQUE INDEX "activities_slug_uq" ON "activities" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "activities_dest_idx" ON "activities" USING btree ("destination_id");--> statement-breakpoint
CREATE INDEX "activities_status_idx" ON "activities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "activities_tier_idx" ON "activities" USING btree ("price_tier");--> statement-breakpoint
CREATE INDEX "activities_attraction_idx" ON "activities" USING btree ("attraction_id");--> statement-breakpoint
CREATE INDEX "acl_cat_idx" ON "activity_category_links" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "prices_activity_idx" ON "activity_prices" USING btree ("activity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prices_current_uq" ON "activity_prices" USING btree ("activity_id") WHERE is_current;--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "admin_audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attractions_slug_uq" ON "attractions" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "attractions_dest_idx" ON "attractions" USING btree ("destination_id");--> statement-breakpoint
CREATE INDEX "comments_candidate_idx" ON "comments" USING btree ("candidate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "destinations_slug_uq" ON "destinations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "destinations_region_idx" ON "destinations" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "destinations_status_idx" ON "destinations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "entity_media_idx" ON "entity_media" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_media_uq" ON "entity_media" USING btree ("entity_type","entity_id","media_id");--> statement-breakpoint
CREATE INDEX "expenses_trip_idx" ON "expenses" USING btree ("trip_id");--> statement-breakpoint
CREATE UNIQUE INDEX "votes_uq" ON "group_votes" USING btree ("candidate_id","member_id");--> statement-breakpoint
CREATE INDEX "votes_member_idx" ON "group_votes" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "days_trip_date_uq" ON "itinerary_days" USING btree ("trip_id","date");--> statement-breakpoint
CREATE INDEX "items_day_idx" ON "itinerary_items" USING btree ("day_id");--> statement-breakpoint
CREATE INDEX "items_trip_idx" ON "itinerary_items" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "contacts_user_idx" ON "networking_contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reviews_activity_idx" ON "reviews" USING btree ("activity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_user_activity_uq" ON "reviews" USING btree ("activity_id","user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sv_entity_idx" ON "source_verifications" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "sv_source_idx" ON "source_verifications" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_url_title_uq" ON "sources" USING btree ("url","title");--> statement-breakpoint
CREATE INDEX "legs_trip_idx" ON "transport_legs" USING btree ("trip_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guides_slug_uq" ON "travel_guides" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "guides_section_idx" ON "travel_guides" USING btree ("section_id");--> statement-breakpoint
CREATE UNIQUE INDEX "candidates_trip_activity_uq" ON "trip_candidates" USING btree ("trip_id","activity_id");--> statement-breakpoint
CREATE INDEX "members_trip_idx" ON "trip_members" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "members_user_idx" ON "trip_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_trip_user_uq" ON "trip_members" USING btree ("trip_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trips_invite_uq" ON "trips" USING btree ("invite_code");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "wishlist_uq" ON "wishlist_items" USING btree ("user_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "wishlist_user_idx" ON "wishlist_items" USING btree ("user_id");