CREATE TABLE `accommodations` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`destination_id` text,
	`name` text NOT NULL,
	`type` text DEFAULT 'airbnb' NOT NULL,
	`check_in` text NOT NULL,
	`check_out` text NOT NULL,
	`cost_vnd` integer DEFAULT 0 NOT NULL,
	`cost_mode` text DEFAULT 'total' NOT NULL,
	`participants` text,
	`status` text DEFAULT 'idea' NOT NULL,
	`url` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `acc_trip_idx` ON `accommodations` (`trip_id`);--> statement-breakpoint
CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`destination_id` text NOT NULL,
	`attraction_id` text,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`price_tier` text NOT NULL,
	`summary` text NOT NULL,
	`description` text NOT NULL,
	`what_you_do` text NOT NULL,
	`steps` text NOT NULL,
	`duration_bucket` text NOT NULL,
	`duration_text` text NOT NULL,
	`duration_hours` real NOT NULL,
	`difficulty` text NOT NULL,
	`intensity` integer NOT NULL,
	`min_age` text,
	`skills` text NOT NULL,
	`safety` text NOT NULL,
	`availability` text NOT NULL,
	`months` text NOT NULL,
	`december_status` text NOT NULL,
	`december_note` text NOT NULL,
	`weather_dependent` integer NOT NULL,
	`min_participants` text,
	`suitability` text NOT NULL,
	`group_note` text NOT NULL,
	`booking` text NOT NULL,
	`cancellation` text,
	`bring` text NOT NULL,
	`wear` text NOT NULL,
	`transport` text NOT NULL,
	`accessibility` text NOT NULL,
	`provider_links` text NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text,
	FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attraction_id`) REFERENCES `attractions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activities_slug_uq` ON `activities` (`slug`);--> statement-breakpoint
CREATE INDEX `activities_dest_idx` ON `activities` (`destination_id`);--> statement-breakpoint
CREATE INDEX `activities_status_idx` ON `activities` (`status`);--> statement-breakpoint
CREATE INDEX `activities_tier_idx` ON `activities` (`price_tier`);--> statement-breakpoint
CREATE TABLE `activity_alternatives` (
	`activity_id` text NOT NULL,
	`alternative_id` text NOT NULL,
	`type` text NOT NULL,
	PRIMARY KEY(`activity_id`, `alternative_id`, `type`),
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`alternative_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `activity_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`description` text,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activity_categories_slug_unique` ON `activity_categories` (`slug`);--> statement-breakpoint
CREATE TABLE `activity_category_links` (
	`activity_id` text NOT NULL,
	`category_id` text NOT NULL,
	PRIMARY KEY(`activity_id`, `category_id`),
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `activity_categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `acl_cat_idx` ON `activity_category_links` (`category_id`);--> statement-breakpoint
CREATE TABLE `activity_prices` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`min_vnd` integer NOT NULL,
	`max_vnd` integer NOT NULL,
	`unit` text NOT NULL,
	`basis` text NOT NULL,
	`status` text NOT NULL,
	`audience` text DEFAULT 'adult' NOT NULL,
	`includes` text NOT NULL,
	`excludes` text NOT NULL,
	`extras` text NOT NULL,
	`validity` text,
	`is_current` integer DEFAULT true NOT NULL,
	`verified_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `prices_activity_idx` ON `activity_prices` (`activity_id`);--> statement-breakpoint
CREATE TABLE `admin_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`actor_name` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`summary` text NOT NULL,
	`diff` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `admin_audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `attractions` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`destination_id` text NOT NULL,
	`name` text NOT NULL,
	`local_name` text,
	`kind` text NOT NULL,
	`lat` real,
	`lng` real,
	`description` text NOT NULL,
	`what_to_see` text NOT NULL,
	`what_to_do` text NOT NULL,
	`opening_hours_text` text NOT NULL,
	`opening_hours_status` text NOT NULL,
	`fee_text` text NOT NULL,
	`fee_min_vnd` integer,
	`fee_max_vnd` integer,
	`fee_status` text NOT NULL,
	`visit_duration` text NOT NULL,
	`accessibility` text NOT NULL,
	`distance_from_centre` text NOT NULL,
	`seasonality` text NOT NULL,
	`official_url` text,
	`booking` text NOT NULL,
	`is_free` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text,
	FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attractions_slug_uq` ON `attractions` (`slug`);--> statement-breakpoint
CREATE INDEX `attractions_dest_idx` ON `attractions` (`destination_id`);--> statement-breakpoint
CREATE TABLE `budget_categories` (
	`slug` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`budget_per_day` integer,
	`balanced_per_day` integer,
	`comfortable_per_day` integer,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `checklist_progress` (
	`user_id` text NOT NULL,
	`item_id` text NOT NULL,
	`done_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `item_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `preparation_checklists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`member_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`candidate_id`) REFERENCES `trip_candidates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `trip_members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `comments_candidate_idx` ON `comments` (`candidate_id`);--> statement-breakpoint
CREATE TABLE `comparisons` (
	`user_id` text NOT NULL,
	`activity_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `activity_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `destination_relationships` (
	`from_id` text NOT NULL,
	`to_id` text NOT NULL,
	`distance_km` integer,
	`travel` text NOT NULL,
	PRIMARY KEY(`from_id`, `to_id`),
	FOREIGN KEY (`from_id`) REFERENCES `destinations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_id`) REFERENCES `destinations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `destinations` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`local_name` text,
	`kind` text NOT NULL,
	`region_id` text NOT NULL,
	`parent_id` text,
	`province` text NOT NULL,
	`former_province` text,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`tagline` text NOT NULL,
	`summary` text NOT NULL,
	`intro` text NOT NULL,
	`why_special` text NOT NULL,
	`why_visit` text NOT NULL,
	`unique_text` text NOT NULL,
	`ideal_for` text NOT NULL,
	`days_min` integer NOT NULL,
	`days_max` integer NOT NULL,
	`travel_style` text NOT NULL,
	`spending_level` integer NOT NULL,
	`adventure_level` integer NOT NULL,
	`popularity` integer DEFAULT 50 NOT NULL,
	`highlights` text NOT NULL,
	`months` text NOT NULL,
	`weather` text NOT NULL,
	`december_note` text NOT NULL,
	`transport_hubs` text NOT NULL,
	`food` text NOT NULL,
	`nightlife` text NOT NULL,
	`practical` text NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text,
	FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `destinations_slug_uq` ON `destinations` (`slug`);--> statement-breakpoint
CREATE INDEX `destinations_region_idx` ON `destinations` (`region_id`);--> statement-breakpoint
CREATE INDEX `destinations_status_idx` ON `destinations` (`status`);--> statement-breakpoint
CREATE TABLE `entity_media` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`media_id` text NOT NULL,
	`role` text DEFAULT 'gallery' NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `entity_media_idx` ON `entity_media` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `event_organisers` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`city` text NOT NULL,
	`description` text NOT NULL,
	`organiser` text NOT NULL,
	`url` text,
	`how_to_engage` text NOT NULL,
	`cadence` text NOT NULL,
	`price` text NOT NULL,
	`status` text NOT NULL,
	`publish_status` text DEFAULT 'published' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_organisers_slug_unique` ON `event_organisers` (`slug`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`category_slug` text NOT NULL,
	`label` text NOT NULL,
	`amount_vnd` integer NOT NULL,
	`cost_mode` text DEFAULT 'total' NOT NULL,
	`participants` text,
	`destination_id` text,
	`date` text,
	`is_quote` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_slug`) REFERENCES `budget_categories`(`slug`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `expenses_trip_idx` ON `expenses` (`trip_id`);--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`type` text NOT NULL,
	`page` text,
	`message` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `group_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`member_id` text NOT NULL,
	`vote` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `trip_candidates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `trip_members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `votes_uq` ON `group_votes` (`candidate_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `guide_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`letter` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`icon` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guide_sections_slug_unique` ON `guide_sections` (`slug`);--> statement-breakpoint
CREATE TABLE `itinerary_days` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`date` text NOT NULL,
	`destination_id` text,
	`title` text,
	`notes` text,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `days_trip_date_uq` ON `itinerary_days` (`trip_id`,`date`);--> statement-breakpoint
CREATE TABLE `itinerary_items` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`day_id` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`type` text NOT NULL,
	`activity_id` text,
	`transport_leg_id` text,
	`accommodation_id` text,
	`title` text NOT NULL,
	`start_time` text,
	`duration_min` integer,
	`cost_vnd` integer DEFAULT 0 NOT NULL,
	`cost_mode` text DEFAULT 'per_person' NOT NULL,
	`participants` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`day_id`) REFERENCES `itinerary_days`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`transport_leg_id`) REFERENCES `transport_legs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accommodation_id`) REFERENCES `accommodations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `items_day_idx` ON `itinerary_items` (`day_id`);--> statement-breakpoint
CREATE INDEX `items_trip_idx` ON `itinerary_items` (`trip_id`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`src` text NOT NULL,
	`width` integer,
	`height` integer,
	`alt` text NOT NULL,
	`title` text,
	`author` text,
	`license` text,
	`license_url` text,
	`source_url` text,
	`representative` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `networking_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`company` text,
	`role` text,
	`met_at` text,
	`notes` text,
	`follow_up_date` text,
	`followed_up` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `contacts_user_idx` ON `networking_contacts` (`user_id`);--> statement-breakpoint
CREATE TABLE `preparation_checklists` (
	`id` text PRIMARY KEY NOT NULL,
	`list` text NOT NULL,
	`group_slug` text NOT NULL,
	`label` text NOT NULL,
	`detail` text,
	`due_days_before` integer,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `professional_events` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`organiser_id` text,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`city` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`venue` text NOT NULL,
	`price` text NOT NULL,
	`registration_url` text NOT NULL,
	`description` text NOT NULL,
	`organiser` text NOT NULL,
	`last_verified` text NOT NULL,
	`publish_status` text DEFAULT 'published' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`organiser_id`) REFERENCES `event_organisers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `professional_events_slug_unique` ON `professional_events` (`slug`);--> statement-breakpoint
CREATE TABLE `regions` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`tagline` text NOT NULL,
	`summary` text NOT NULL,
	`description` text NOT NULL,
	`climate` text NOT NULL,
	`highlights` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`image_query` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `regions_slug_unique` ON `regions` (`slug`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rating` integer NOT NULL,
	`body` text NOT NULL,
	`visited_on` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reviews_activity_idx` ON `reviews` (`activity_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text
);
--> statement-breakpoint
CREATE TABLE `source_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`checked` text NOT NULL,
	`status` text NOT NULL,
	`confidence` text NOT NULL,
	`verified_at` text NOT NULL,
	`verified_by` text,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sv_entity_idx` ON `source_verifications` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `sv_source_idx` ON `source_verifications` (`source_id`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`publisher` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sources_url_title_uq` ON `sources` (`url`,`title`);--> statement-breakpoint
CREATE TABLE `transport_legs` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`from_destination_id` text,
	`to_destination_id` text,
	`from_label` text NOT NULL,
	`to_label` text NOT NULL,
	`mode` text NOT NULL,
	`depart_at` text,
	`arrive_at` text,
	`duration_min` integer,
	`cost_vnd` integer DEFAULT 0 NOT NULL,
	`cost_mode` text DEFAULT 'per_person' NOT NULL,
	`participants` text,
	`overnight` integer DEFAULT false NOT NULL,
	`luggage_note` text,
	`booking_ref` text,
	`is_fixed` integer DEFAULT false NOT NULL,
	`is_international` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'idea' NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_destination_id`) REFERENCES `destinations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`to_destination_id`) REFERENCES `destinations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `legs_trip_idx` ON `transport_legs` (`trip_id`);--> statement-breakpoint
CREATE TABLE `travel_guides` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`summary` text NOT NULL,
	`body` text NOT NULL,
	`key_facts` text NOT NULL,
	`warnings` text NOT NULL,
	`last_verified` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `guide_sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guides_slug_uq` ON `travel_guides` (`slug`);--> statement-breakpoint
CREATE INDEX `guides_section_idx` ON `travel_guides` (`section_id`);--> statement-breakpoint
CREATE TABLE `trip_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`activity_id` text NOT NULL,
	`added_by` text,
	`status` text DEFAULT 'discussion' NOT NULL,
	`participation` text DEFAULT 'optional' NOT NULL,
	`participants` text,
	`agreed_price_vnd` integer,
	`price_is_quote` integer DEFAULT false NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`added_by`) REFERENCES `trip_members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `candidates_trip_activity_uq` ON `trip_candidates` (`trip_id`,`activity_id`);--> statement-breakpoint
CREATE TABLE `trip_members` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`user_id` text,
	`display_name` text NOT NULL,
	`avatar_color` text DEFAULT '#377A61' NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`traveller_type` text DEFAULT 'solo' NOT NULL,
	`couple_group` text,
	`sort` integer DEFAULT 0 NOT NULL,
	`joined_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `members_trip_idx` ON `trip_members` (`trip_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_trip_user_uq` ON `trip_members` (`trip_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `trip_preferences` (
	`member_id` text PRIMARY KEY NOT NULL,
	`interests` text DEFAULT '[]' NOT NULL,
	`preferred_destinations` text DEFAULT '[]' NOT NULL,
	`adventure_tolerance` integer DEFAULT 3 NOT NULL,
	`fitness` integer DEFAULT 3 NOT NULL,
	`food_preferences` text DEFAULT '[]' NOT NULL,
	`accommodation` text DEFAULT 'shared_property' NOT NULL,
	`nightlife` integer DEFAULT 3 NOT NULL,
	`budget_inr` integer,
	`free_vs_paid` integer DEFAULT 3 NOT NULL,
	`avoid` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `trip_members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`travellers_count` integer NOT NULL,
	`budget_min_inr` integer,
	`budget_max_inr` integer,
	`budget_target_inr` integer,
	`currency` text DEFAULT 'INR' NOT NULL,
	`scenario` text DEFAULT 'balanced' NOT NULL,
	`vote_privacy` text DEFAULT 'named' NOT NULL,
	`invite_code` text NOT NULL,
	`description` text,
	`settings` text DEFAULT '{}' NOT NULL,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trips_invite_uq` ON `trips` (`invite_code`);--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`headline` text,
	`introduction` text,
	`linkedin_url` text,
	`interests` text DEFAULT '[]' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`password_hash` text,
	`display_name` text NOT NULL,
	`avatar_color` text DEFAULT '#377A61' NOT NULL,
	`role` text DEFAULT 'visitor' NOT NULL,
	`is_guest` integer DEFAULT true NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`disabled_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_uq` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `wishlist_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`state` text DEFAULT 'wishlist' NOT NULL,
	`priority` integer DEFAULT 2 NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wishlist_uq` ON `wishlist_items` (`user_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `wishlist_user_idx` ON `wishlist_items` (`user_id`);