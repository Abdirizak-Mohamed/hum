CREATE TABLE `onboarding_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`current_step` text,
	`step_results` text DEFAULT '{}',
	`intake_data` text,
	`blocked_reason` text,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `onboarding_sessions_client_id_unique` ON `onboarding_sessions` (`client_id`);