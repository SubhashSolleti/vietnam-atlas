-- Repair rows that older versions accepted but the new CHECK / UNIQUE constraints reject.
UPDATE `transport_legs` SET `arrive_at` = NULL WHERE `depart_at` IS NOT NULL AND `arrive_at` IS NOT NULL AND `arrive_at` <= `depart_at`;--> statement-breakpoint
UPDATE `transport_legs` SET `cost_vnd` = 0 WHERE `cost_vnd` < 0;--> statement-breakpoint
UPDATE `accommodations` SET `check_out` = date(`check_in`, '+1 day') WHERE `check_out` <= `check_in`;--> statement-breakpoint
UPDATE `accommodations` SET `cost_vnd` = 0 WHERE `cost_vnd` < 0;--> statement-breakpoint
UPDATE `trips` SET `end_date` = `start_date` WHERE `end_date` < `start_date`;--> statement-breakpoint
UPDATE `trips` SET `budget_max_inr` = NULL WHERE `budget_min_inr` IS NOT NULL AND `budget_max_inr` IS NOT NULL AND `budget_min_inr` > `budget_max_inr`;--> statement-breakpoint
UPDATE `trips` SET `travellers_count` = MIN(30, MAX(1, (SELECT COUNT(*) FROM `trip_members` m WHERE m.`trip_id` = `trips`.`id`))) WHERE `travellers_count` NOT BETWEEN 1 AND 30;--> statement-breakpoint
UPDATE `activity_prices` SET `min_vnd` = MAX(0, `min_vnd`);--> statement-breakpoint
UPDATE `activity_prices` SET `max_vnd` = `min_vnd` WHERE `max_vnd` < `min_vnd`;--> statement-breakpoint
UPDATE `activity_prices` SET `is_current` = 0 WHERE `is_current` = 1 AND `rowid` NOT IN (SELECT MAX(`rowid`) FROM `activity_prices` WHERE `is_current` = 1 GROUP BY `activity_id`);--> statement-breakpoint
UPDATE `reviews` SET `rating` = MIN(5, MAX(1, `rating`));--> statement-breakpoint
DELETE FROM `reviews` WHERE `rowid` NOT IN (SELECT MAX(`rowid`) FROM `reviews` GROUP BY `activity_id`, `user_id`);--> statement-breakpoint
DELETE FROM `entity_media` WHERE `rowid` NOT IN (SELECT MIN(`rowid`) FROM `entity_media` GROUP BY `entity_type`, `entity_id`, `media_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_activity_prices` (
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
	`unit_capacity` integer,
	`ticket_bundle` text,
	`is_current` integer DEFAULT true NOT NULL,
	`verified_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "prices_range_ck" CHECK(min_vnd >= 0 AND max_vnd >= min_vnd)
);
--> statement-breakpoint
INSERT INTO `__new_activity_prices`("id", "activity_id", "min_vnd", "max_vnd", "unit", "basis", "status", "audience", "includes", "excludes", "extras", "validity", "unit_capacity", "ticket_bundle", "is_current", "verified_at", "created_at") SELECT "id", "activity_id", "min_vnd", "max_vnd", "unit", "basis", "status", "audience", "includes", "excludes", "extras", "validity", NULL, NULL, "is_current", "verified_at", "created_at" FROM `activity_prices`;--> statement-breakpoint
DROP TABLE `activity_prices`;--> statement-breakpoint
ALTER TABLE `__new_activity_prices` RENAME TO `activity_prices`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `prices_activity_idx` ON `activity_prices` (`activity_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `prices_current_uq` ON `activity_prices` (`activity_id`) WHERE is_current = 1;--> statement-breakpoint
CREATE INDEX `activities_attraction_idx` ON `activities` (`attraction_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `entity_media_uq` ON `entity_media` (`entity_type`,`entity_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `votes_member_idx` ON `group_votes` (`member_id`);--> statement-breakpoint
CREATE TABLE `__new_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rating` integer NOT NULL,
	`body` text NOT NULL,
	`visited_on` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "reviews_rating_ck" CHECK(rating BETWEEN 1 AND 5)
);
--> statement-breakpoint
INSERT INTO `__new_reviews`("id", "activity_id", "user_id", "rating", "body", "visited_on", "status", "created_at") SELECT "id", "activity_id", "user_id", "rating", "body", "visited_on", "status", "created_at" FROM `reviews`;--> statement-breakpoint
DROP TABLE `reviews`;--> statement-breakpoint
ALTER TABLE `__new_reviews` RENAME TO `reviews`;--> statement-breakpoint
CREATE INDEX `reviews_activity_idx` ON `reviews` (`activity_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_user_activity_uq` ON `reviews` (`activity_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `members_user_idx` ON `trip_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_accommodations` (
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
	FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "acc_dates_ck" CHECK(check_out > check_in),
	CONSTRAINT "acc_cost_ck" CHECK(cost_vnd >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_accommodations`("id", "trip_id", "destination_id", "name", "type", "check_in", "check_out", "cost_vnd", "cost_mode", "participants", "status", "url", "notes", "created_at", "updated_at") SELECT "id", "trip_id", "destination_id", "name", "type", "check_in", "check_out", "cost_vnd", "cost_mode", "participants", "status", "url", "notes", "created_at", "updated_at" FROM `accommodations`;--> statement-breakpoint
DROP TABLE `accommodations`;--> statement-breakpoint
ALTER TABLE `__new_accommodations` RENAME TO `accommodations`;--> statement-breakpoint
CREATE INDEX `acc_trip_idx` ON `accommodations` (`trip_id`);--> statement-breakpoint
CREATE TABLE `__new_transport_legs` (
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
	FOREIGN KEY (`to_destination_id`) REFERENCES `destinations`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "legs_times_ck" CHECK(depart_at IS NULL OR arrive_at IS NULL OR arrive_at > depart_at),
	CONSTRAINT "legs_cost_ck" CHECK(cost_vnd >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_transport_legs`("id", "trip_id", "from_destination_id", "to_destination_id", "from_label", "to_label", "mode", "depart_at", "arrive_at", "duration_min", "cost_vnd", "cost_mode", "participants", "overnight", "luggage_note", "booking_ref", "is_fixed", "is_international", "status", "notes", "created_at", "updated_at") SELECT "id", "trip_id", "from_destination_id", "to_destination_id", "from_label", "to_label", "mode", "depart_at", "arrive_at", "duration_min", "cost_vnd", "cost_mode", "participants", "overnight", "luggage_note", "booking_ref", "is_fixed", "is_international", "status", "notes", "created_at", "updated_at" FROM `transport_legs`;--> statement-breakpoint
DROP TABLE `transport_legs`;--> statement-breakpoint
ALTER TABLE `__new_transport_legs` RENAME TO `transport_legs`;--> statement-breakpoint
CREATE INDEX `legs_trip_idx` ON `transport_legs` (`trip_id`);--> statement-breakpoint
CREATE TABLE `__new_trips` (
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
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "trips_dates_ck" CHECK(end_date >= start_date),
	CONSTRAINT "trips_budget_ck" CHECK(budget_min_inr IS NULL OR budget_max_inr IS NULL OR budget_min_inr <= budget_max_inr),
	CONSTRAINT "trips_travellers_ck" CHECK(travellers_count BETWEEN 1 AND 30)
);
--> statement-breakpoint
INSERT INTO `__new_trips`("id", "name", "start_date", "end_date", "travellers_count", "budget_min_inr", "budget_max_inr", "budget_target_inr", "currency", "scenario", "vote_privacy", "invite_code", "description", "settings", "created_by", "created_at", "updated_at") SELECT "id", "name", "start_date", "end_date", "travellers_count", "budget_min_inr", "budget_max_inr", "budget_target_inr", "currency", "scenario", "vote_privacy", "invite_code", "description", "settings", "created_by", "created_at", "updated_at" FROM `trips`;--> statement-breakpoint
DROP TABLE `trips`;--> statement-breakpoint
ALTER TABLE `__new_trips` RENAME TO `trips`;--> statement-breakpoint
CREATE UNIQUE INDEX `trips_invite_uq` ON `trips` (`invite_code`);