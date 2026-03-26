import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from './schema.js';
import type { HumDb } from './connection.js';

export async function createPgliteDb(dataDir?: string): Promise<HumDb> {
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });

  // Push schema directly for dev/test (no migration files needed)
  await client.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      business_name TEXT NOT NULL,
      address TEXT,
      latitude REAL,
      longitude REAL,
      phone TEXT,
      email TEXT NOT NULL,
      opening_hours JSONB,
      delivery_platforms JSONB DEFAULT '[]',
      plan_tier TEXT NOT NULL DEFAULT 'starter',
      stripe_customer_id TEXT,
      status TEXT NOT NULL DEFAULT 'onboarding',
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS brand_profiles (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL UNIQUE REFERENCES clients(id),
      brand_voice_guide TEXT,
      key_selling_points JSONB DEFAULT '[]',
      target_audience_profile TEXT,
      content_themes JSONB DEFAULT '[]',
      hashtag_strategy JSONB DEFAULT '[]',
      peak_posting_times JSONB DEFAULT '{}',
      menu_items JSONB DEFAULT '[]',
      brand_colours JSONB DEFAULT '[]',
      logo_url TEXT,
      generated_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS social_accounts (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id),
      platform TEXT NOT NULL,
      platform_account_id TEXT NOT NULL,
      ayrshare_profile_key TEXT,
      status TEXT NOT NULL DEFAULT 'disconnected',
      created_at BIGINT NOT NULL,
      connected_at BIGINT,
      updated_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS content_items (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id),
      content_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      caption TEXT,
      hashtags JSONB DEFAULT '[]',
      cta TEXT,
      media_urls JSONB DEFAULT '[]',
      platforms JSONB DEFAULT '[]',
      scheduled_at BIGINT,
      posted_at BIGINT,
      performance JSONB,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS onboarding_sessions (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL UNIQUE REFERENCES clients(id),
      status TEXT NOT NULL DEFAULT 'in_progress',
      current_step TEXT,
      step_results JSONB DEFAULT '{}',
      intake_data JSONB,
      blocked_reason TEXT,
      started_at BIGINT NOT NULL,
      completed_at BIGINT,
      updated_at BIGINT NOT NULL
    );
  `);

  return {
    db: db as HumDb['db'],
    async close() {
      await client.close();
    },
  };
}
