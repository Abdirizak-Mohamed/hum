# Cloud Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy Hum to AWS using SST Ion with RDS Postgres, Lambda compute, S3 media storage, and dev/prod stages.

**Architecture:** Single SST stack defines all resources. hum-core switches from SQLite to Postgres (PGlite for local dev/tests). Content engine and onboarding become Lambda handlers triggered by EventBridge cron and async invocation respectively. Dashboard deploys as SST's Nextjs component. Media moves from local filesystem to S3.

**Tech Stack:** SST Ion, AWS (RDS Postgres, Lambda, S3, VPC, EventBridge), Drizzle ORM (postgres dialect), PGlite, @aws-sdk/client-s3

---

## File Map

### New files
- `sst.config.ts` — SST infrastructure definition (all resources)
- `hum-core/src/db/connection-pg.ts` — Postgres connection via node-postgres
- `hum-core/src/db/connection-pglite.ts` — PGlite connection for local dev/tests
- `hum-content-engine/src/handler.ts` — Lambda entry point for content engine
- `hum-content-engine/src/storage/s3.ts` — S3StorageClient implementation
- `hum-content-engine/src/storage/__tests__/s3.test.ts` — S3StorageClient tests
- `hum-onboarding/src/handler.ts` — Lambda entry point for onboarding
- `.github/workflows/deploy.yml` — CI/CD pipeline

### Modified files
- `hum-core/package.json` — add `pg`, `@electric-sql/pglite`; remove `better-sqlite3`
- `hum-core/src/db/connection.ts` — rewrite to dispatch to pg or pglite based on DATABASE_URL
- `hum-core/src/db/schema.ts` — rewrite from sqliteTable to pgTable
- `hum-core/src/index.ts` — update exports (HumDb type changes)
- `hum-core/src/models/*.ts` — wrap timestamp numbers in Date constructors
- `hum-core/src/repositories/client.ts` — change Db type from BetterSQLite3Database to generic
- `hum-core/src/repositories/brand-profile.ts` — same Db type change
- `hum-core/src/repositories/content-item.ts` — same Db type change
- `hum-core/src/repositories/social-account.ts` — same Db type change
- `hum-core/drizzle.config.ts` — update to postgres dialect
- `hum-core/src/db/__tests__/connection.test.ts` — update for async PGlite
- `hum-core/src/repositories/__tests__/*.test.ts` — update for async PGlite
- `hum-onboarding/src/pipeline/types.ts` — change Db type
- `hum-onboarding/src/session/repository.ts` — change Db type
- `hum-onboarding/src/index.ts` — change Db type
- `hum-onboarding/src/cli.ts` — async createDb
- `hum-content-engine/src/cli.ts` — async createDb
- `hum-content-engine/package.json` — add `@aws-sdk/client-s3`
- `hum-content-engine/src/index.ts` — export S3StorageClient
- `hum-dashboard/src/lib/db.ts` — rewrite for async createDb
- `hum-dashboard/src/app/api/*/route.ts` — use async getDb()
- `hum-dashboard/src/app/api/media/[...path]/route.ts` — rewrite for S3
- `hum-dashboard/package.json` — add `@aws-sdk/client-s3`
- `package.json` (root) — add `sst` devDependency
- `.env.example` — update for Postgres and S3

### Removed files
- `hum-core/src/db/migrations/0000_faithful_silver_sable.sql` — old SQLite migrations
- `hum-core/src/db/migrations/0001_petite_gwen_stacy.sql` — old SQLite migrations

---

## Task 1: Rewrite hum-core schema from SQLite to Postgres

**Files:**
- Modify: `hum-core/src/db/schema.ts`

This is the foundation — every other package depends on this schema.

- [ ] **Step 1: Rewrite schema.ts to use pgTable**

Replace the entire file. The column types map as follows: `text` → `text`, `integer` with `timestamp_ms` mode → `bigint` with `{ mode: 'number' }` (keeps JS numbers for timestamps), `real` → `real`.

```ts
// hum-core/src/db/schema.ts
import { pgTable, text, bigint, real } from 'drizzle-orm/pg-core';

// ── Client ──────────────────────────────────────────────

export const clients = pgTable('clients', {
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
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

// ── BrandProfile ────────────────────────────────────────

export const brandProfiles = pgTable('brand_profiles', {
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
  hashtags: text('hashtags', { mode: 'json' }).$type<string[]>().default([]),
  cta: text('cta'),
  mediaUrls: text('media_urls', { mode: 'json' }).$type<string[]>().default([]),
  platforms: text('platforms', { mode: 'json' }).$type<string[]>().default([]),
  scheduledAt: bigint('scheduled_at', { mode: 'number' }),
  postedAt: bigint('posted_at', { mode: 'number' }),
  performance: text('performance', { mode: 'json' }).$type<{
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
  stepResults: text('step_results', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
  intakeData: text('intake_data', { mode: 'json' }).$type<Record<string, unknown>>(),
  blockedReason: text('blocked_reason'),
  startedAt: bigint('started_at', { mode: 'number' }).notNull(),
  completedAt: bigint('completed_at', { mode: 'number' }),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});
```

**Important:** The `integer` with `{ mode: 'timestamp_ms' }` columns (which stored `Date` objects via SQLite) change to `bigint` with `{ mode: 'number' }`. Postgres `text` with `{ mode: 'json' }` works the same as SQLite. This means timestamp columns now store/return **numbers** (epoch ms) instead of `Date` objects. This change propagates to models and repositories (handled in Task 2).

- [ ] **Step 2: Verify the file compiles**

Run: `cd hum-core && npx tsc --noEmit 2>&1 | head -20`

Expected: Type errors in connection.ts, repositories, and models (they still reference SQLite types). This is expected — we fix them in the next tasks.

- [ ] **Step 3: Commit**

```bash
git add hum-core/src/db/schema.ts
git commit -m "refactor(core): rewrite schema from sqliteTable to pgTable"
```

---

## Task 2: Update hum-core models for bigint timestamps

**Files:**
- Modify: `hum-core/src/models/client.ts`
- Modify: `hum-core/src/models/brand-profile.ts`
- Modify: `hum-core/src/models/content-item.ts`
- Modify: `hum-core/src/models/social-account.ts`

The schema change from `integer({ mode: 'timestamp_ms' })` to `bigint({ mode: 'number' })` means `InferSelectModel` now returns `number` for timestamp fields instead of `Date`. Models need to convert `number` → `Date` in their constructors.

- [ ] **Step 1: Update Client model**

In `hum-core/src/models/client.ts`, the `ClientRow` type will now have `createdAt: number` and `updatedAt: number` instead of `Date`. Update the constructor:

```ts
// hum-core/src/models/client.ts
import { type InferSelectModel } from 'drizzle-orm';
import { type clients } from '../db/schema.js';
import { plans, type PlanTier, type PlanConfig, PLAN_TIERS } from '../config/plans.js';

export type ClientRow = InferSelectModel<typeof clients>;

export class Client {
  readonly id: string;
  readonly businessName: string;
  readonly address: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly phone: string | null;
  readonly email: string;
  readonly openingHours: Record<string, string> | null;
  readonly deliveryPlatforms: string[];
  readonly planTier: PlanTier;
  readonly stripeCustomerId: string | null;
  readonly status: 'onboarding' | 'active' | 'paused' | 'churned';
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(row: ClientRow) {
    this.id = row.id;
    this.businessName = row.businessName;
    this.address = row.address;
    this.latitude = row.latitude;
    this.longitude = row.longitude;
    this.phone = row.phone;
    this.email = row.email;
    this.openingHours = row.openingHours;
    this.deliveryPlatforms = row.deliveryPlatforms ?? [];
    this.planTier = row.planTier as PlanTier;
    this.stripeCustomerId = row.stripeCustomerId;
    this.status = row.status;
    this.createdAt = new Date(row.createdAt);
    this.updatedAt = new Date(row.updatedAt);
  }

  isActive(): boolean { return this.status === 'active'; }
  canUpgradeTo(tier: PlanTier): boolean {
    return PLAN_TIERS.indexOf(tier) > PLAN_TIERS.indexOf(this.planTier);
  }
  getPlanConfig(): PlanConfig { return plans[this.planTier]; }
}
```

The key change is `this.createdAt = new Date(row.createdAt)` and `this.updatedAt = new Date(row.updatedAt)` — wrapping the epoch ms number in a Date. Previously `row.createdAt` was already a `Date` (SQLite mode handled it), so the old `this.createdAt = row.createdAt` just passed it through. `new Date(dateObj)` still works, but now it also handles the `number` case.

- [ ] **Step 2: Update BrandProfile, ContentItem, SocialAccount models**

Apply the same pattern to all timestamp fields in each model. Read each file, find timestamp assignments, wrap with `new Date(...)`:

- `brand-profile.ts`: `generatedAt`, `updatedAt`
- `content-item.ts`: `scheduledAt`, `postedAt`, `createdAt`, `updatedAt`
- `social-account.ts`: `connectedAt`, `createdAt`, `updatedAt`

For nullable timestamps (like `connectedAt`, `scheduledAt`, `postedAt`, `completedAt`), use: `this.connectedAt = row.connectedAt ? new Date(row.connectedAt) : null;`

- [ ] **Step 3: Commit**

```bash
git add hum-core/src/models/
git commit -m "refactor(core): update model constructors for bigint timestamps"
```

---

## Task 3: Update hum-core repositories — replace BetterSQLite3Database with generic Db type

**Files:**
- Modify: `hum-core/src/db/connection.ts`
- Modify: `hum-core/src/repositories/client.ts`
- Modify: `hum-core/src/repositories/brand-profile.ts`
- Modify: `hum-core/src/repositories/content-item.ts`
- Modify: `hum-core/src/repositories/social-account.ts`
- Modify: `hum-core/src/index.ts`

Every repository currently imports `BetterSQLite3Database` and defines `type Db = BetterSQLite3Database<typeof schema>`. We need a generic `Db` type that works with both PGlite and node-postgres. Drizzle's `BaseSQLiteDatabase` and `PgDatabase` are different, but all query methods (`.select()`, `.insert()`, `.update()`, `.delete()`) share the same API surface through Drizzle's unified API when using the same schema. We'll define a `Db` type alias in a shared location.

- [ ] **Step 1: Create a shared Db type**

Add the Db type export to `connection.ts`. For now, stub it — we'll fill in the real connection logic in Task 4. The key is getting the type right so repositories compile.

Replace `hum-core/src/db/connection.ts` with:

```ts
// hum-core/src/db/connection.ts
import * as schema from './schema.js';

// Drizzle's PgDatabase with our schema. Works for both node-postgres and PGlite
// since both use the pg dialect.
import { type PgDatabase } from 'drizzle-orm/pg-core';

export type HumDb = {
  db: PgDatabase<any, typeof schema>;
  close(): void | Promise<void>;
};

export async function createDb(url?: string): Promise<HumDb> {
  const dbUrl = url ?? process.env.DATABASE_URL ?? '';

  if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
    const { createPgDb } = await import('./connection-pg.js');
    return createPgDb(dbUrl);
  } else {
    const { createPgliteDb } = await import('./connection-pglite.js');
    return createPgliteDb(dbUrl || undefined);
  }
}
```

**Note:** `createDb` is now **async** (dynamic imports). All call sites need to be updated to `await createDb()`.

- [ ] **Step 2: Update all four repositories to use the new Db type**

In each repository file, replace:
```ts
import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from '../db/schema.js';

type Db = BetterSQLite3Database<typeof schema>;
```

With:
```ts
import type { HumDb } from '../db/connection.js';

type Db = HumDb['db'];
```

Files to update:
- `hum-core/src/repositories/client.ts`
- `hum-core/src/repositories/brand-profile.ts`
- `hum-core/src/repositories/content-item.ts`
- `hum-core/src/repositories/social-account.ts`

Also in each repository, replace `.run()` calls with `.execute()` — Drizzle's Postgres driver uses `.execute()` not `.run()`:
- `db.insert(...).values(...).run()` → `db.insert(...).values(...).execute()`
- `db.update(...).set(...).where(...).run()` → `db.update(...).set(...).where(...).execute()`
- `db.delete(...).where(...).run()` → `db.delete(...).where(...).execute()`

And replace `.get()` calls with indexing into the result array — Postgres Drizzle doesn't have `.get()`:
- `db.select().from(table).where(...).get()` → `(await db.select().from(table).where(...).limit(1))[0]`
- `db.select().from(table).all()` → `db.select().from(table)`

Also in repositories, timestamps are now stored as epoch ms numbers. Where repositories write `new Date()` for `createdAt`/`updatedAt`, change to `Date.now()`:
- `createdAt: new Date()` → `createdAt: Date.now()`
- `updatedAt: new Date()` → `updatedAt: Date.now()`
- `{ ...data, updatedAt: new Date() }` → `{ ...data, updatedAt: Date.now() }`

- [ ] **Step 3: Update hum-core/src/index.ts**

Update the `createDb` and `HumDb` exports. `createDb` is now async, and `HumDb` is the new type:

```ts
// Just update the connection import line
export { createDb, type HumDb } from './db/connection.js';
```

No other changes needed — the rest of the exports reference schema.ts which is already updated.

- [ ] **Step 4: Commit**

```bash
git add hum-core/src/db/connection.ts hum-core/src/repositories/ hum-core/src/index.ts
git commit -m "refactor(core): replace SQLite Db type with generic PgDatabase type"
```

---

## Task 4: Implement Postgres and PGlite connection modules

**Files:**
- Create: `hum-core/src/db/connection-pg.ts`
- Create: `hum-core/src/db/connection-pglite.ts`
- Modify: `hum-core/package.json`

- [ ] **Step 1: Install dependencies**

```bash
cd /Users/abdi/workplace/hum-2/hum && pnpm --filter hum-core add pg && pnpm --filter hum-core add -D @types/pg @electric-sql/pglite
```

- [ ] **Step 2: Create connection-pg.ts (production — node-postgres)**

```ts
// hum-core/src/db/connection-pg.ts
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from './schema.js';
import type { HumDb } from './connection.js';

export async function createPgDb(url: string): Promise<HumDb> {
  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  await migrate(db, {
    migrationsFolder: new URL('./migrations', import.meta.url).pathname,
  });

  return {
    db,
    async close() {
      await pool.end();
    },
  };
}
```

- [ ] **Step 3: Create connection-pglite.ts (local dev / tests)**

```ts
// hum-core/src/db/connection-pglite.ts
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from './schema.js';
import type { HumDb } from './connection.js';

export async function createPgliteDb(dataDir?: string): Promise<HumDb> {
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });

  // PGlite: push schema directly (no migration files needed for dev/test)
  await client.exec(`
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
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
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
      hashtags TEXT DEFAULT '[]',
      cta TEXT,
      media_urls TEXT DEFAULT '[]',
      platforms TEXT DEFAULT '[]',
      scheduled_at BIGINT,
      posted_at BIGINT,
      performance TEXT,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS onboarding_sessions (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL UNIQUE REFERENCES clients(id),
      status TEXT NOT NULL DEFAULT 'in_progress',
      current_step TEXT,
      step_results TEXT DEFAULT '{}',
      intake_data TEXT,
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
```

- [ ] **Step 4: Commit**

```bash
git add hum-core/src/db/connection-pg.ts hum-core/src/db/connection-pglite.ts hum-core/package.json
git commit -m "feat(core): add Postgres and PGlite connection modules"
```

---

## Task 5: Update hum-core tests for async createDb and PGlite

**Files:**
- Modify: `hum-core/src/db/__tests__/connection.test.ts`
- Modify: `hum-core/src/repositories/__tests__/client.test.ts`
- Modify: `hum-core/src/repositories/__tests__/brand-profile.test.ts`
- Modify: `hum-core/src/repositories/__tests__/content-item.test.ts`
- Modify: `hum-core/src/repositories/__tests__/social-account.test.ts`
- Modify: `hum-core/src/schemas/__tests__/index.test.ts`

All tests currently call `createDb(':memory:')` synchronously. Now `createDb()` is async and PGlite is the default for non-postgres URLs.

- [ ] **Step 1: Update connection.test.ts**

```ts
// hum-core/src/db/__tests__/connection.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { createDb, type HumDb } from '../connection.js';
import { clients } from '../schema.js';

describe('createDb', () => {
  let humDb: HumDb;

  afterEach(async () => {
    await humDb?.close();
  });

  it('creates a PGlite database when no postgres URL given', async () => {
    humDb = await createDb();
    expect(humDb).toBeDefined();
    expect(humDb.db).toBeDefined();
  });

  it('can execute queries after schema creation', async () => {
    humDb = await createDb();
    const result = await humDb.db.select().from(clients);
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Update repository tests**

In each repository test file, change:
- `humDb = createDb(':memory:')` → `humDb = await createDb()`
- `beforeEach(() => {` → `beforeEach(async () => {`
- `afterEach(() => {` → `afterEach(async () => {`
- `humDb?.close()` → `await humDb?.close()`

Apply this pattern to all four repository test files: `client.test.ts`, `brand-profile.test.ts`, `content-item.test.ts`, `social-account.test.ts`.

Also update any `.all()` calls to plain `await` (Postgres driver returns arrays directly):
- If tests reference `db.select().from(table).all()`, change to `db.select().from(table)`.
- If tests reference `.get()`, change to `(await db.select()...limit(1))[0]`.

- [ ] **Step 3: Run hum-core tests**

Run: `cd /Users/abdi/workplace/hum-2/hum && pnpm --filter hum-core test`

Expected: All tests pass. If there are failures, fix the specific issues (likely `.run()` → `.execute()` or `.get()` → `[0]` misses).

- [ ] **Step 4: Commit**

```bash
git add hum-core/src/
git commit -m "test(core): update all tests for async PGlite createDb"
```

---

## Task 6: Update hum-core Drizzle config and generate Postgres migrations

**Files:**
- Modify: `hum-core/drizzle.config.ts`
- Delete: `hum-core/src/db/migrations/0000_faithful_silver_sable.sql`
- Delete: `hum-core/src/db/migrations/0001_petite_gwen_stacy.sql`
- Create: `hum-core/src/db/migrations/*.sql` (generated)

- [ ] **Step 1: Update drizzle.config.ts for Postgres**

```ts
// hum-core/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://localhost:5432/hum_dev',
  },
});
```

- [ ] **Step 2: Delete old SQLite migrations**

```bash
rm hum-core/src/db/migrations/0000_faithful_silver_sable.sql
rm hum-core/src/db/migrations/0001_petite_gwen_stacy.sql
rm -f hum-core/src/db/migrations/meta/_journal.json
rm -f hum-core/src/db/migrations/meta/0000_snapshot.json
rm -f hum-core/src/db/migrations/meta/0001_snapshot.json
```

- [ ] **Step 3: Generate fresh Postgres migrations**

```bash
cd /Users/abdi/workplace/hum-2/hum/hum-core && npx drizzle-kit generate
```

Expected: Creates a new migration SQL file in `src/db/migrations/` with Postgres-compatible `CREATE TABLE` statements.

- [ ] **Step 4: Commit**

```bash
git add hum-core/drizzle.config.ts hum-core/src/db/migrations/
git commit -m "feat(core): generate fresh Postgres migrations, remove SQLite migrations"
```

---

## Task 7: Update hum-onboarding for new Db type and async createDb

**Files:**
- Modify: `hum-onboarding/src/pipeline/types.ts`
- Modify: `hum-onboarding/src/session/repository.ts`
- Modify: `hum-onboarding/src/index.ts`
- Modify: `hum-onboarding/src/cli.ts`

- [ ] **Step 1: Update pipeline/types.ts**

Replace:
```ts
import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from 'hum-core/dist/db/schema.js';
```

With:
```ts
import type { HumDb } from 'hum-core';
```

And change:
```ts
export type Db = BetterSQLite3Database<typeof schema>;
```

To:
```ts
export type Db = HumDb['db'];
```

Update `OnboardingContext` accordingly (no change needed — it already uses `Db`).

- [ ] **Step 2: Update session/repository.ts**

Replace:
```ts
import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from 'hum-core/dist/db/schema.js';

type Db = BetterSQLite3Database<typeof schema>;
```

With:
```ts
import type { HumDb } from 'hum-core';

type Db = HumDb['db'];
```

Also update all query patterns:
- `.run()` → `.execute()`
- `.get()` → `(await ...limit(1))[0]`
- `.all()` → remove `.all()`
- Timestamps: `new Date()` → `Date.now()` where used for `startedAt`, `updatedAt`

- [ ] **Step 3: Update index.ts Db type**

Replace:
```ts
import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from 'hum-core/dist/db/schema.js';
```

With:
```ts
import type { HumDb } from 'hum-core';
```

Change parameter type:
```ts
type Db = BetterSQLite3Database<typeof schema>;
```
To:
```ts
type Db = HumDb['db'];
```

- [ ] **Step 4: Update cli.ts for async createDb**

Change:
```ts
const humDb = createDb(process.env.DATABASE_URL);
```

To:
```ts
const humDb = await createDb(process.env.DATABASE_URL);
```

And at end, change:
```ts
humDb.close();
```

To:
```ts
await humDb.close();
```

- [ ] **Step 5: Run tests**

Run: `cd /Users/abdi/workplace/hum-2/hum && pnpm --filter hum-onboarding test`

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add hum-onboarding/src/
git commit -m "refactor(onboarding): update for Postgres Db type and async createDb"
```

---

## Task 8: Update hum-content-engine for new Db type and async createDb

**Files:**
- Modify: `hum-content-engine/src/cli.ts`
- Modify: any files referencing `BetterSQLite3Database` or `createDb` synchronously

- [ ] **Step 1: Update cli.ts for async createDb**

Change:
```ts
const humDb = createDb(process.env.DATABASE_URL);
```

To:
```ts
const humDb = await createDb(process.env.DATABASE_URL);
```

And at end, change `humDb.close()` → `await humDb.close()`.

- [ ] **Step 2: Check for any other BetterSQLite3Database references in content-engine**

Run: `grep -r "BetterSQLite3Database" hum-content-engine/`

If any found, update them with the same pattern from Task 7.

- [ ] **Step 3: Update content-engine tests for async createDb**

In `hum-content-engine/src/pipeline/__tests__/orchestrator.test.ts` and any other test files that call `createDb(':memory:')`:
- Change `humDb = createDb(':memory:')` → `humDb = await createDb()`
- Change `beforeEach(() => {` → `beforeEach(async () => {`
- Change `humDb?.close()` → `await humDb?.close()`

- [ ] **Step 4: Run tests**

Run: `cd /Users/abdi/workplace/hum-2/hum && pnpm --filter hum-content-engine test`

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add hum-content-engine/src/
git commit -m "refactor(content-engine): update for Postgres Db type and async createDb"
```

---

## Task 9: Update hum-dashboard for async createDb

**Files:**
- Modify: `hum-dashboard/src/lib/db.ts`

- [ ] **Step 1: Rewrite db.ts for async createDb**

The current lazy-singleton Proxy pattern relies on synchronous `createDb()`. With async, we need a different approach — a promise-based singleton:

```ts
// hum-dashboard/src/lib/db.ts
import { createDb, type HumDb } from 'hum-core';

let _dbPromise: Promise<HumDb['db']> | null = null;

export function getDb(): Promise<HumDb['db']> {
  if (!_dbPromise) {
    _dbPromise = createDb().then(({ db }) => db);
  }
  return _dbPromise;
}
```

- [ ] **Step 2: Update all API routes that import db**

Every API route currently does `import { db } from '@/lib/db'` and uses `db` synchronously. They all need to `await getDb()` instead.

For example, `hum-dashboard/src/app/api/clients/route.ts` changes from:

```ts
import { db } from '@/lib/db';
// ...
const clients = await clientRepo.list(db);
```

To:

```ts
import { getDb } from '@/lib/db';
// ...
const db = await getDb();
const clients = await clientRepo.list(db);
```

Apply this pattern to all route files:
- `api/clients/route.ts`
- `api/clients/[id]/route.ts`
- `api/content/route.ts`
- `api/content/[id]/route.ts`
- `api/fleet/stats/route.ts`
- `api/issues/route.ts`
- `api/issues/[id]/dismiss/route.ts`
- `api/issues/[id]/retry/route.ts`
- `api/auth/login/route.ts`
- `api/auth/logout/route.ts`

- [ ] **Step 3: Commit**

```bash
git add hum-dashboard/src/
git commit -m "refactor(dashboard): update for async createDb"
```

---

## Task 10: Add S3StorageClient to hum-content-engine

**Files:**
- Create: `hum-content-engine/src/storage/s3.ts`
- Create: `hum-content-engine/src/storage/__tests__/s3.test.ts`
- Modify: `hum-content-engine/package.json`

- [ ] **Step 1: Install AWS SDK S3 client**

```bash
cd /Users/abdi/workplace/hum-2/hum && pnpm --filter hum-content-engine add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

- [ ] **Step 2: Write failing test for S3StorageClient**

```ts
// hum-content-engine/src/storage/__tests__/s3.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { S3StorageClient } from '../s3.js';

// Mock the AWS SDK
vi.mock('@aws-sdk/client-s3', () => {
  const send = vi.fn().mockResolvedValue({});
  return {
    S3Client: vi.fn().mockImplementation(() => ({ send })),
    PutObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    DeleteObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    GetObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://bucket.s3.amazonaws.com/signed-url'),
}));

describe('S3StorageClient', () => {
  let storage: S3StorageClient;

  beforeEach(() => {
    storage = new S3StorageClient('test-bucket');
  });

  it('saves a file and returns the S3 key', async () => {
    const data = Buffer.from('fake image data');
    const key = await storage.save('client-1', 'content-1', data, 'png');
    expect(key).toBe('client-1/content-1.png');
  });

  it('getUrl returns a presigned URL', async () => {
    const url = storage.getUrl('client-1/content-1.png');
    expect(url).toContain('client-1/content-1.png');
  });

  it('deletes a file', async () => {
    await expect(storage.delete('client-1/content-1.png')).resolves.not.toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd /Users/abdi/workplace/hum-2/hum && pnpm --filter hum-content-engine test -- src/storage/__tests__/s3.test.ts`

Expected: FAIL — `S3StorageClient` doesn't exist yet.

- [ ] **Step 4: Implement S3StorageClient**

```ts
// hum-content-engine/src/storage/s3.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import type { StorageClient } from './types.js';

export class S3StorageClient implements StorageClient {
  private s3: S3Client;
  private bucket: string;

  constructor(bucket: string, region?: string) {
    this.bucket = bucket;
    this.s3 = new S3Client({ region: region ?? process.env.AWS_REGION ?? 'us-east-1' });
  }

  async save(clientId: string, contentId: string, data: Buffer, ext: string): Promise<string> {
    const key = `${clientId}/${contentId}.${ext}`;
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: this.getMimeType(ext),
    }));
    return key;
  }

  getUrl(key: string): string {
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }

  private getMimeType(ext: string): string {
    const types: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return types[ext] ?? 'application/octet-stream';
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/abdi/workplace/hum-2/hum && pnpm --filter hum-content-engine test -- src/storage/__tests__/s3.test.ts`

Expected: PASS

- [ ] **Step 6: Export S3StorageClient from content-engine index**

Add to `hum-content-engine/src/index.ts`:
```ts
export { S3StorageClient } from './storage/s3.js';
```

- [ ] **Step 7: Commit**

```bash
git add hum-content-engine/src/storage/s3.ts hum-content-engine/src/storage/__tests__/s3.test.ts hum-content-engine/src/index.ts hum-content-engine/package.json
git commit -m "feat(content-engine): add S3StorageClient for cloud media storage"
```

---

## Task 11: Add Lambda handler for content engine

**Files:**
- Create: `hum-content-engine/src/handler.ts`

- [ ] **Step 1: Create Lambda handler**

This wraps the existing pipeline logic into a Lambda-compatible entry point. EventBridge invokes this on a cron schedule.

```ts
// hum-content-engine/src/handler.ts
import { createDb, clientRepo, brandProfileRepo, logger } from 'hum-core';
import { createAiClient, createSocialClient } from 'hum-integrations';
import { S3StorageClient } from './storage/s3.js';
import { defaultConfig } from './config.js';
import { runPipeline } from './pipeline/orchestrator.js';

export async function run() {
  logger.info('Content engine Lambda invoked');

  const humDb = await createDb(process.env.DATABASE_URL);
  const ai = createAiClient({});
  const social = createSocialClient({});
  const storage = new S3StorageClient(process.env.MEDIA_BUCKET ?? 'hum-media');
  const config = { ...defaultConfig, dryRun: false };

  try {
    const clients = await clientRepo.list(humDb.db, { status: 'active' });
    logger.info(`Processing ${clients.length} active clients`);

    let totalScheduled = 0;
    let totalFailed = 0;

    for (const client of clients) {
      const brand = await brandProfileRepo.getByClientId(humDb.db, client.id);
      if (!brand) {
        logger.warn(`No brand profile for client ${client.id}, skipping`);
        continue;
      }

      const result = await runPipeline(client, brand, {
        ai, social, storage, db: humDb.db, config,
      });

      totalScheduled += result.scheduled;
      totalFailed += result.failed;
      logger.info(`${client.businessName}: ${result.scheduled} scheduled, ${result.failed} failed`);
    }

    logger.info(`Batch complete: ${totalScheduled} scheduled, ${totalFailed} failed across ${clients.length} clients`);

    return { statusCode: 200, body: { totalScheduled, totalFailed, clients: clients.length } };
  } finally {
    await humDb.close();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add hum-content-engine/src/handler.ts
git commit -m "feat(content-engine): add Lambda handler for EventBridge cron"
```

---

## Task 12: Add Lambda handler for onboarding

**Files:**
- Create: `hum-onboarding/src/handler.ts`

- [ ] **Step 1: Create Lambda handler**

This is invoked async from the dashboard. It receives intake data in the event payload and runs the onboarding pipeline.

```ts
// hum-onboarding/src/handler.ts
import { createDb, logger } from 'hum-core';
import { createAiClient } from 'hum-integrations';
import { createStubContentEngine } from './engine/stub.js';
import { startOnboarding, resumeOnboarding } from './index.js';
import type { IntakeData } from './session/types.js';

type OnboardingEvent = {
  action: 'start' | 'resume';
  intakeData?: IntakeData;
  sessionId?: string;
};

export async function run(event: OnboardingEvent) {
  logger.info(`Onboarding Lambda invoked: ${event.action}`);

  const humDb = await createDb(process.env.DATABASE_URL);
  const ai = createAiClient({});
  const contentEngine = createStubContentEngine();
  const integrations = { ai, contentEngine };

  try {
    if (event.action === 'start' && event.intakeData) {
      const session = await startOnboarding(humDb.db, event.intakeData, integrations);
      logger.info(`Onboarding started: session=${session.id} status=${session.status}`);
      return { statusCode: 200, body: { sessionId: session.id, status: session.status } };
    }

    if (event.action === 'resume' && event.sessionId) {
      const session = await resumeOnboarding(humDb.db, event.sessionId, integrations);
      logger.info(`Onboarding resumed: session=${session.id} status=${session.status}`);
      return { statusCode: 200, body: { sessionId: session.id, status: session.status } };
    }

    return { statusCode: 400, body: { error: 'Invalid event: provide action + intakeData or sessionId' } };
  } finally {
    await humDb.close();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add hum-onboarding/src/handler.ts
git commit -m "feat(onboarding): add Lambda handler for async invocation"
```

---

## Task 13: Update dashboard media route for S3

**Files:**
- Modify: `hum-dashboard/src/app/api/media/[...path]/route.ts`

- [ ] **Step 1: Install S3 SDK in dashboard**

```bash
cd /Users/abdi/workplace/hum-2/hum && pnpm --filter hum-dashboard add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

- [ ] **Step 2: Rewrite media route for S3**

```ts
// hum-dashboard/src/app/api/media/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type RouteContext = { params: Promise<{ path: string[] }> };

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const BUCKET = process.env.MEDIA_BUCKET;

export async function GET(_req: NextRequest, { params }: RouteContext) {
  if (!BUCKET) {
    // Fallback: local file serving for dev without S3
    const { readFile } = await import('fs/promises');
    const path = await import('path');
    const { path: segments } = await params;
    const MEDIA_BASE = path.resolve(process.env.MEDIA_STORAGE_PATH ?? './media');
    const filePath = path.resolve(MEDIA_BASE, segments.join('/'));
    if (!filePath.startsWith(MEDIA_BASE)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    try {
      const buffer = await readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const types: Record<string, string> = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
      };
      return new NextResponse(new Uint8Array(buffer), {
        headers: { 'Content-Type': types[ext] ?? 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable' },
      });
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  }

  try {
    const { path: segments } = await params;
    const key = segments.join('/');

    const url = await getSignedUrl(s3, new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }), { expiresIn: 3600 });

    return NextResponse.redirect(url);
  } catch (err) {
    console.error('[media/[...path]] Error:', err);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add hum-dashboard/src/app/api/media/ hum-dashboard/package.json
git commit -m "feat(dashboard): serve media from S3 with presigned URLs, local fallback"
```

---

## Task 14: Create SST config

**Files:**
- Create: `sst.config.ts`
- Modify: `package.json` (root)

- [ ] **Step 1: Install SST**

```bash
cd /Users/abdi/workplace/hum-2/hum && pnpm add -Dw sst
```

- [ ] **Step 2: Initialize SST types**

```bash
cd /Users/abdi/workplace/hum-2/hum && npx sst types
```

This generates `.sst/` directory with type definitions.

- [ ] **Step 3: Create sst.config.ts**

```ts
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "hum",
      removal: input?.stage === "prod" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: { region: "us-east-1" },
      },
    };
  },
  async run() {
    // VPC with cheap EC2 NAT instance
    const vpc = new sst.aws.Vpc("Vpc", { nat: "ec2" });

    // RDS Postgres
    const rds = new sst.aws.Postgres("Db", {
      vpc,
      instance: "db.t4g.micro",
    });

    // S3 media storage
    const media = new sst.aws.Bucket("Media");

    // Secrets
    const openaiKey = new sst.Secret("OpenaiApiKey");
    const falKey = new sst.Secret("FalApiKey");
    const ayrshareKey = new sst.Secret("AyrshareApiKey");
    const stripeKey = new sst.Secret("StripeSecretKey");
    const stripeWebhook = new sst.Secret("StripeWebhookSecret");

    const allLinks = [rds, media, openaiKey, falKey, ayrshareKey, stripeKey, stripeWebhook];

    // Dashboard (Next.js)
    const dashboard = new sst.aws.Nextjs("Dashboard", {
      path: "hum-dashboard",
      vpc,
      link: allLinks,
      environment: {
        MEDIA_BUCKET: media.name,
        DATABASE_URL: $interpolate`postgres://${rds.username}:${rds.password}@${rds.host}:${rds.port}/${rds.database}`,
      },
    });

    // Content engine — weekly cron (Sunday 2am UTC)
    new sst.aws.Cron("ContentEngine", {
      schedule: "cron(0 2 ? * SUN *)",
      function: {
        handler: "hum-content-engine/src/handler.run",
        timeout: "15 minutes",
        memory: "1024 MB",
        vpc,
        link: allLinks,
        environment: {
          MEDIA_BUCKET: media.name,
          DATABASE_URL: $interpolate`postgres://${rds.username}:${rds.password}@${rds.host}:${rds.port}/${rds.database}`,
        },
      },
    });

    // Onboarding — on-demand async invocation
    const onboarding = new sst.aws.Function("Onboarding", {
      handler: "hum-onboarding/src/handler.run",
      timeout: "15 minutes",
      memory: "1024 MB",
      vpc,
      link: allLinks,
      environment: {
        MEDIA_BUCKET: media.name,
        DATABASE_URL: $interpolate`postgres://${rds.username}:${rds.password}@${rds.host}:${rds.port}/${rds.database}`,
      },
    });

    return {
      dashboardUrl: dashboard.url,
      onboardingFn: onboarding.name,
    };
  },
});
```

- [ ] **Step 4: Add .sst to .gitignore**

```bash
echo ".sst" >> /Users/abdi/workplace/hum-2/hum/.gitignore
```

- [ ] **Step 5: Commit**

```bash
git add sst.config.ts package.json .gitignore
git commit -m "feat: add SST config for AWS deployment"
```

---

## Task 15: Create GitHub Actions CI/CD pipeline

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create the workflow file**

```bash
mkdir -p /Users/abdi/workplace/hum-2/hum/.github/workflows
```

- [ ] **Step 2: Write deploy.yml**

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
    tags: ['v*']

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm build

      - run: pnpm test

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy to dev
        if: github.ref == 'refs/heads/main'
        run: npx sst deploy --stage dev

      - name: Deploy to prod
        if: startsWith(github.ref, 'refs/tags/v')
        run: npx sst deploy --stage prod
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions deploy pipeline for dev and prod"
```

---

## Task 16: Remove stale SQLite dependencies and clean up

**Files:**
- Modify: `hum-core/package.json`

- [ ] **Step 1: Remove better-sqlite3 from hum-core**

```bash
cd /Users/abdi/workplace/hum-2/hum && pnpm --filter hum-core remove better-sqlite3 @types/better-sqlite3
```

- [ ] **Step 2: Verify no remaining SQLite references in source**

Run: `grep -r "better-sqlite3\|BetterSQLite3" hum-core/src/ hum-onboarding/src/ hum-content-engine/src/ hum-dashboard/src/ --include='*.ts'`

Expected: No matches. If any remain, fix them.

- [ ] **Step 3: Run full test suite**

Run: `cd /Users/abdi/workplace/hum-2/hum && pnpm test`

Expected: All packages pass.

- [ ] **Step 4: Build all packages**

Run: `cd /Users/abdi/workplace/hum-2/hum && pnpm build`

Expected: All packages build successfully.

- [ ] **Step 5: Commit**

```bash
git add hum-core/package.json pnpm-lock.yaml
git commit -m "chore(core): remove better-sqlite3 dependency"
```

---

## Task 17: Update .env.example and documentation

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Update .env.example**

```
# Database (Postgres connection string for cloud, or leave empty for PGlite local dev)
DATABASE_URL=

# S3 media storage (set for cloud, leave empty for local filesystem fallback)
MEDIA_BUCKET=

# OpenAI
OPENAI_API_KEY=

# fal.ai (FLUX image generation)
FAL_API_KEY=

# Ayrshare (social media posting)
AYRSHARE_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Google Business Profile
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Integration mock mode (set to "true" for development without real APIs)
HUM_MOCK_INTEGRATIONS=true
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: update .env.example for Postgres and S3 config"
```
