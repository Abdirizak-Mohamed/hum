CREATE TABLE `brand_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`brand_voice_guide` text,
	`key_selling_points` text DEFAULT '[]',
	`target_audience_profile` text,
	`content_themes` text DEFAULT '[]',
	`hashtag_strategy` text DEFAULT '[]',
	`peak_posting_times` text DEFAULT '{}',
	`menu_items` text DEFAULT '[]',
	`brand_colours` text DEFAULT '[]',
	`logo_url` text,
	`generated_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brand_profiles_client_id_unique` ON `brand_profiles` (`client_id`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`business_name` text NOT NULL,
	`address` text,
	`latitude` real,
	`longitude` real,
	`phone` text,
	`email` text NOT NULL,
	`opening_hours` text,
	`delivery_platforms` text DEFAULT '[]',
	`plan_tier` text DEFAULT 'starter' NOT NULL,
	`stripe_customer_id` text,
	`status` text DEFAULT 'onboarding' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `content_items` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`content_type` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`caption` text,
	`hashtags` text DEFAULT '[]',
	`cta` text,
	`media_urls` text DEFAULT '[]',
	`platforms` text DEFAULT '[]',
	`scheduled_at` integer,
	`posted_at` integer,
	`performance` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `social_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`platform` text NOT NULL,
	`platform_account_id` text NOT NULL,
	`ayrshare_profile_key` text,
	`status` text DEFAULT 'disconnected' NOT NULL,
	`created_at` integer NOT NULL,
	`connected_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
