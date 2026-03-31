CREATE TABLE `client_uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`portal_user_id` text NOT NULL,
	`filename` text NOT NULL,
	`storage_path` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`portal_user_id`) REFERENCES `portal_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `intake_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`portal_user_id` text NOT NULL,
	`business_name` text NOT NULL,
	`address` text,
	`phone` text,
	`opening_hours` text,
	`menu_data` text,
	`menu_upload_ids` text DEFAULT '[]',
	`food_photo_upload_ids` text DEFAULT '[]',
	`social_links` text,
	`brand_preferences` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`submitted_at` integer,
	`reviewed_at` integer,
	`review_notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`portal_user_id`) REFERENCES `portal_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `intake_submissions_portal_user_id_unique` ON `intake_submissions` (`portal_user_id`);--> statement-breakpoint
CREATE TABLE `portal_users` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'pending_intake' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_login_at` integer,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portal_users_email_unique` ON `portal_users` (`email`);