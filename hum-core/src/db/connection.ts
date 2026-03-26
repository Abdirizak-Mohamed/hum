import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.js';

export type HumDb = ReturnType<typeof createDb>;

export function createDb(url: string = process.env.DATABASE_URL || './hum.db') {
  const sqlite = new Database(url);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });

  if (url === ':memory:') {
    pushSchema(sqlite);
  } else {
    migrate(db, { migrationsFolder: new URL('./migrations', import.meta.url).pathname });
  }

  return {
    db,
    close() {
      sqlite.close();
    },
  };
}

function pushSchema(sqlite: InstanceType<typeof Database>) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      business_name TEXT NOT NULL,
      address TEXT,
      latitude REAL,
      longitude REAL,
      phone TEXT,
      email TEXT NOT NULL,
      opening_hours TEXT,
      delivery_platforms TEXT DEFAULT '[]',
      plan_tier TEXT NOT NULL DEFAULT 'starter',
      stripe_customer_id TEXT,
      status TEXT NOT NULL DEFAULT 'onboarding',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS brand_profiles (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL UNIQUE REFERENCES clients(id),
      brand_voice_guide TEXT,
      key_selling_points TEXT DEFAULT '[]',
      target_audience_profile TEXT,
      content_themes TEXT DEFAULT '[]',
      hashtag_strategy TEXT DEFAULT '[]',
      peak_posting_times TEXT DEFAULT '{}',
      menu_items TEXT DEFAULT '[]',
      brand_colours TEXT DEFAULT '[]',
      logo_url TEXT,
      generated_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS social_accounts (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id),
      platform TEXT NOT NULL,
      platform_account_id TEXT NOT NULL,
      ayrshare_profile_key TEXT,
      status TEXT NOT NULL DEFAULT 'disconnected',
      created_at INTEGER NOT NULL,
      connected_at INTEGER,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS content_items (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id),
      content_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      caption TEXT,
      hashtags TEXT DEFAULT '[]',
      cta TEXT,
      media_urls TEXT DEFAULT '[]',
      platforms TEXT DEFAULT '[]',
      scheduled_at INTEGER,
      posted_at INTEGER,
      performance TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS onboarding_sessions (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL UNIQUE REFERENCES clients(id),
      status TEXT NOT NULL DEFAULT 'in_progress',
      current_step TEXT,
      step_results TEXT DEFAULT '{}',
      intake_data TEXT,
      blocked_reason TEXT,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS portal_users (
      id TEXT PRIMARY KEY,
      client_id TEXT REFERENCES clients(id),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_intake',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_login_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS client_uploads (
      id TEXT PRIMARY KEY,
      portal_user_id TEXT NOT NULL REFERENCES portal_users(id),
      filename TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS intake_submissions (
      id TEXT PRIMARY KEY,
      portal_user_id TEXT NOT NULL UNIQUE REFERENCES portal_users(id),
      business_name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      opening_hours TEXT,
      menu_data TEXT,
      menu_upload_ids TEXT DEFAULT '[]',
      food_photo_upload_ids TEXT DEFAULT '[]',
      social_links TEXT,
      brand_preferences TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      submitted_at INTEGER,
      reviewed_at INTEGER,
      review_notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}
