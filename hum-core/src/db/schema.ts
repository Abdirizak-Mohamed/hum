import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ── Client ──────────────────────────────────────────────

export const clients = sqliteTable('clients', {
  id: text('id').primaryKey(),
  businessName: text('business_name').notNull(),
  address: text('address'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  phone: text('phone'),
  email: text('email').notNull(),
  openingHours: text('opening_hours', { mode: 'json' }).$type<Record<string, string>>(),
  deliveryPlatforms: text('delivery_platforms', { mode: 'json' }).$type<string[]>().default([]),
  planTier: text('plan_tier', { enum: ['starter', 'growth', 'premium'] }).notNull().default('starter'),
  stripeCustomerId: text('stripe_customer_id'),
  status: text('status', { enum: ['onboarding', 'active', 'paused', 'churned'] }).notNull().default('onboarding'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

// ── BrandProfile ────────────────────────────────────────

export const brandProfiles = sqliteTable('brand_profiles', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => clients.id).unique(),
  brandVoiceGuide: text('brand_voice_guide'),
  keySellingPoints: text('key_selling_points', { mode: 'json' }).$type<string[]>().default([]),
  targetAudienceProfile: text('target_audience_profile'),
  contentThemes: text('content_themes', { mode: 'json' }).$type<string[]>().default([]),
  hashtagStrategy: text('hashtag_strategy', { mode: 'json' }).$type<string[]>().default([]),
  peakPostingTimes: text('peak_posting_times', { mode: 'json' }).$type<Record<string, string[]>>().default({}),
  menuItems: text('menu_items', { mode: 'json' }).$type<Array<{
    name: string;
    description: string;
    category: string;
    price: number;
    photoUrl?: string;
  }>>().default([]),
  brandColours: text('brand_colours', { mode: 'json' }).$type<string[]>().default([]),
  logoUrl: text('logo_url'),
  generatedAt: integer('generated_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

// ── SocialAccount ───────────────────────────────────────

export const socialAccounts = sqliteTable('social_accounts', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => clients.id),
  platform: text('platform', { enum: ['instagram', 'facebook', 'tiktok', 'google_business'] }).notNull(),
  platformAccountId: text('platform_account_id').notNull(),
  ayrshareProfileKey: text('ayrshare_profile_key'),
  status: text('status', { enum: ['connected', 'disconnected', 'expired'] }).notNull().default('disconnected'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  connectedAt: integer('connected_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

// ── ContentItem ─────────────────────────────────────────

export const contentItems = sqliteTable('content_items', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => clients.id),
  contentType: text('content_type', {
    enum: ['food_hero', 'short_video', 'deal_offer', 'behind_scenes', 'google_post', 'review_highlight', 'trending'],
  }).notNull(),
  status: text('status', { enum: ['draft', 'scheduled', 'posted', 'failed'] }).notNull().default('draft'),
  caption: text('caption'),
  hashtags: text('hashtags', { mode: 'json' }).$type<string[]>().default([]),
  cta: text('cta'),
  mediaUrls: text('media_urls', { mode: 'json' }).$type<string[]>().default([]),
  platforms: text('platforms', { mode: 'json' }).$type<string[]>().default([]),
  scheduledAt: integer('scheduled_at', { mode: 'timestamp_ms' }),
  postedAt: integer('posted_at', { mode: 'timestamp_ms' }),
  performance: text('performance', { mode: 'json' }).$type<{
    reach: number;
    impressions: number;
    engagement: number;
    clicks: number;
  }>(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});
