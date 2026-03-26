import { pgTable, text, bigint, real, jsonb } from 'drizzle-orm/pg-core';

// ── Client ──────────────────────────────────────────────

export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  businessName: text('business_name').notNull(),
  address: text('address'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  phone: text('phone'),
  email: text('email').notNull(),
  openingHours: jsonb('opening_hours').$type<Record<string, string>>(),
  deliveryPlatforms: jsonb('delivery_platforms').$type<string[]>().default([]),
  planTier: text('plan_tier', { enum: ['starter', 'growth', 'premium'] }).notNull().default('starter'),
  stripeCustomerId: text('stripe_customer_id'),
  status: text('status', { enum: ['onboarding', 'active', 'paused', 'churned'] }).notNull().default('onboarding'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

// ── BrandProfile ────────────────────────────────────────

export const brandProfiles = pgTable('brand_profiles', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => clients.id).unique(),
  brandVoiceGuide: text('brand_voice_guide'),
  keySellingPoints: jsonb('key_selling_points').$type<string[]>().default([]),
  targetAudienceProfile: text('target_audience_profile'),
  contentThemes: jsonb('content_themes').$type<string[]>().default([]),
  hashtagStrategy: jsonb('hashtag_strategy').$type<string[]>().default([]),
  peakPostingTimes: jsonb('peak_posting_times').$type<Record<string, string[]>>().default({}),
  menuItems: jsonb('menu_items').$type<Array<{
    name: string;
    description: string;
    category: string;
    price: number;
    photoUrl?: string;
  }>>().default([]),
  brandColours: jsonb('brand_colours').$type<string[]>().default([]),
  logoUrl: text('logo_url'),
  generatedAt: bigint('generated_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

// ── SocialAccount ───────────────────────────────────────

export const socialAccounts = pgTable('social_accounts', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => clients.id),
  platform: text('platform', { enum: ['instagram', 'facebook', 'tiktok', 'google_business'] }).notNull(),
  platformAccountId: text('platform_account_id').notNull(),
  ayrshareProfileKey: text('ayrshare_profile_key'),
  status: text('status', { enum: ['connected', 'disconnected', 'expired'] }).notNull().default('disconnected'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  connectedAt: bigint('connected_at', { mode: 'number' }),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

// ── ContentItem ─────────────────────────────────────────

export const contentItems = pgTable('content_items', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => clients.id),
  contentType: text('content_type', {
    enum: ['food_hero', 'short_video', 'deal_offer', 'behind_scenes', 'google_post', 'review_highlight', 'trending'],
  }).notNull(),
  status: text('status', { enum: ['draft', 'scheduled', 'posted', 'failed'] }).notNull().default('draft'),
  caption: text('caption'),
  hashtags: jsonb('hashtags').$type<string[]>().default([]),
  cta: text('cta'),
  mediaUrls: jsonb('media_urls').$type<string[]>().default([]),
  platforms: jsonb('platforms').$type<string[]>().default([]),
  scheduledAt: bigint('scheduled_at', { mode: 'number' }),
  postedAt: bigint('posted_at', { mode: 'number' }),
  performance: jsonb('performance').$type<{
    reach: number;
    impressions: number;
    engagement: number;
    clicks: number;
  }>(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

// ── OnboardingSession ──────────────────────────────────

export const onboardingSessions = pgTable('onboarding_sessions', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => clients.id).unique(),
  status: text('status', { enum: ['in_progress', 'complete', 'failed'] }).notNull().default('in_progress'),
  currentStep: text('current_step'),
  stepResults: jsonb('step_results').$type<Record<string, unknown>>().default({}),
  intakeData: jsonb('intake_data').$type<Record<string, unknown>>(),
  blockedReason: text('blocked_reason'),
  startedAt: bigint('started_at', { mode: 'number' }).notNull(),
  completedAt: bigint('completed_at', { mode: 'number' }),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

// ── PortalUser ─────────────────────────────────────────
export const portalUsers = sqliteTable('portal_users', {
  id: text('id').primaryKey(),
  clientId: text('client_id').references(() => clients.id),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  status: text('status', { enum: ['pending_intake', 'pending_approval', 'active', 'suspended'] }).notNull().default('pending_intake'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp_ms' }),
});

// ── ClientUpload ───────────────────────────────────────
export const clientUploads = sqliteTable('client_uploads', {
  id: text('id').primaryKey(),
  portalUserId: text('portal_user_id').notNull().references(() => portalUsers.id),
  filename: text('filename').notNull(),
  storagePath: text('storage_path').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  category: text('category', { enum: ['food_photo', 'menu', 'logo', 'interior', 'other'] }).notNull(),
  status: text('status', { enum: ['pending', 'used', 'archived'] }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

// ── IntakeSubmission ───────────────────────────────────
export const intakeSubmissions = sqliteTable('intake_submissions', {
  id: text('id').primaryKey(),
  portalUserId: text('portal_user_id').notNull().references(() => portalUsers.id).unique(),
  businessName: text('business_name').notNull(),
  address: text('address'),
  phone: text('phone'),
  openingHours: text('opening_hours', { mode: 'json' }).$type<Record<string, string>>(),
  menuData: text('menu_data'),
  menuUploadIds: text('menu_upload_ids', { mode: 'json' }).$type<string[]>().default([]),
  foodPhotoUploadIds: text('food_photo_upload_ids', { mode: 'json' }).$type<string[]>().default([]),
  socialLinks: text('social_links', { mode: 'json' }).$type<Record<string, string>>(),
  brandPreferences: text('brand_preferences'),
  status: text('status', { enum: ['draft', 'submitted', 'approved', 'rejected'] }).notNull().default('draft'),
  submittedAt: integer('submitted_at', { mode: 'timestamp_ms' }),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }),
  reviewNotes: text('review_notes'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});
