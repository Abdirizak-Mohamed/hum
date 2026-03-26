CREATE TABLE "brand_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"brand_voice_guide" text,
	"key_selling_points" jsonb DEFAULT '[]'::jsonb,
	"target_audience_profile" text,
	"content_themes" jsonb DEFAULT '[]'::jsonb,
	"hashtag_strategy" jsonb DEFAULT '[]'::jsonb,
	"peak_posting_times" jsonb DEFAULT '{}'::jsonb,
	"menu_items" jsonb DEFAULT '[]'::jsonb,
	"brand_colours" jsonb DEFAULT '[]'::jsonb,
	"logo_url" text,
	"generated_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "brand_profiles_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"business_name" text NOT NULL,
	"address" text,
	"latitude" real,
	"longitude" real,
	"phone" text,
	"email" text NOT NULL,
	"opening_hours" jsonb,
	"delivery_platforms" jsonb DEFAULT '[]'::jsonb,
	"plan_tier" text DEFAULT 'starter' NOT NULL,
	"stripe_customer_id" text,
	"status" text DEFAULT 'onboarding' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"content_type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"caption" text,
	"hashtags" jsonb DEFAULT '[]'::jsonb,
	"cta" text,
	"media_urls" jsonb DEFAULT '[]'::jsonb,
	"platforms" jsonb DEFAULT '[]'::jsonb,
	"scheduled_at" bigint,
	"posted_at" bigint,
	"performance" jsonb,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"current_step" text,
	"step_results" jsonb DEFAULT '{}'::jsonb,
	"intake_data" jsonb,
	"blocked_reason" text,
	"started_at" bigint NOT NULL,
	"completed_at" bigint,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "onboarding_sessions_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "social_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"platform" text NOT NULL,
	"platform_account_id" text NOT NULL,
	"ayrshare_profile_key" text,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"created_at" bigint NOT NULL,
	"connected_at" bigint,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;