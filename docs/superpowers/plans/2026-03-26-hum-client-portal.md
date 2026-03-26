# hum-client-portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first client portal with self-service signup/intake, operator-reviewed onboarding, Ayrshare social connect, content preview, photo upload, and account management.

**Architecture:** Next.js 15 App Router mirroring hum-dashboard patterns. BFF API routes hitting hum-core repositories directly. Separate `portal_users` table for auth. Local file storage for uploads.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS, TanStack React Query, bcryptjs, hum-core (Drizzle/SQLite)

**Spec:** `docs/superpowers/specs/2026-03-26-hum-client-portal-design.md`

---

## Task 1: Add portal_users schema, model, repository to hum-core

**Files:**
- Modify: `hum-core/src/db/schema.ts`
- Modify: `hum-core/src/db/connection.ts` (pushSchema for :memory: tests)
- Create: `hum-core/src/models/portal-user.ts`
- Create: `hum-core/src/repositories/portal-user.ts`
- Create: `hum-core/src/repositories/__tests__/portal-user.test.ts`
- Modify: `hum-core/src/repositories/index.ts`
- Modify: `hum-core/src/schemas/index.ts`
- Modify: `hum-core/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `hum-core/src/repositories/__tests__/portal-user.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb } from '../../db/connection.js';
import * as portalUserRepo from '../portal-user.js';
import { PortalUser } from '../../models/portal-user.js';

let humDb: HumDb;

beforeEach(() => {
  humDb = createDb(':memory:');
});

afterEach(() => {
  humDb?.close();
});

describe('portalUserRepo', () => {
  describe('create', () => {
    it('creates a portal user and returns a PortalUser instance', async () => {
      const user = await portalUserRepo.create(humDb.db, {
        email: 'ali@kebabs.com',
        passwordHash: '$2b$10$fakehash',
        name: 'Ali',
      });
      expect(user).toBeInstanceOf(PortalUser);
      expect(user.id).toBeDefined();
      expect(user.email).toBe('ali@kebabs.com');
      expect(user.status).toBe('pending_intake');
      expect(user.clientId).toBeNull();
    });
  });

  describe('getById', () => {
    it('returns the user when found', async () => {
      const created = await portalUserRepo.create(humDb.db, {
        email: 'ali@kebabs.com',
        passwordHash: '$2b$10$fakehash',
        name: 'Ali',
      });
      const found = await portalUserRepo.getById(humDb.db, created.id);
      expect(found).toBeInstanceOf(PortalUser);
      expect(found?.id).toBe(created.id);
    });

    it('returns undefined when not found', async () => {
      const found = await portalUserRepo.getById(humDb.db, 'nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('getByEmail', () => {
    it('returns the user matching the email', async () => {
      await portalUserRepo.create(humDb.db, {
        email: 'ali@kebabs.com',
        passwordHash: '$2b$10$fakehash',
        name: 'Ali',
      });
      const found = await portalUserRepo.getByEmail(humDb.db, 'ali@kebabs.com');
      expect(found?.name).toBe('Ali');
    });
  });

  describe('update', () => {
    it('updates fields and returns updated PortalUser', async () => {
      const created = await portalUserRepo.create(humDb.db, {
        email: 'ali@kebabs.com',
        passwordHash: '$2b$10$fakehash',
        name: 'Ali',
      });
      const updated = await portalUserRepo.update(humDb.db, created.id, {
        status: 'active',
        clientId: 'some-client-id',
      });
      expect(updated.status).toBe('active');
      expect(updated.clientId).toBe('some-client-id');
    });
  });

  describe('list', () => {
    it('returns all users', async () => {
      await portalUserRepo.create(humDb.db, { email: 'a@test.com', passwordHash: 'h', name: 'A' });
      await portalUserRepo.create(humDb.db, { email: 'b@test.com', passwordHash: 'h', name: 'B' });
      const all = await portalUserRepo.list(humDb.db);
      expect(all).toHaveLength(2);
    });

    it('filters by status', async () => {
      const u = await portalUserRepo.create(humDb.db, { email: 'a@test.com', passwordHash: 'h', name: 'A' });
      await portalUserRepo.update(humDb.db, u.id, { status: 'active' });
      await portalUserRepo.create(humDb.db, { email: 'b@test.com', passwordHash: 'h', name: 'B' });
      const active = await portalUserRepo.list(humDb.db, { status: 'active' });
      expect(active).toHaveLength(1);
    });
  });

  describe('remove', () => {
    it('deletes the user', async () => {
      const created = await portalUserRepo.create(humDb.db, {
        email: 'ali@kebabs.com',
        passwordHash: '$2b$10$fakehash',
        name: 'Ali',
      });
      await portalUserRepo.remove(humDb.db, created.id);
      const found = await portalUserRepo.getById(humDb.db, created.id);
      expect(found).toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-core && pnpm test -- --run src/repositories/__tests__/portal-user.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Add schema to `hum-core/src/db/schema.ts`**

Append after the onboarding_sessions table:

```typescript
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
```

- [ ] **Step 4: Add to pushSchema in `hum-core/src/db/connection.ts`**

Add inside the `pushSchema` function's `sqlite.exec(...)` template literal, after the onboarding_sessions table:

```sql
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
```

- [ ] **Step 5: Create model `hum-core/src/models/portal-user.ts`**

```typescript
import { type InferSelectModel } from 'drizzle-orm';
import { type portalUsers } from '../db/schema.js';

export type PortalUserRow = InferSelectModel<typeof portalUsers>;

export type PortalUserStatus = 'pending_intake' | 'pending_approval' | 'active' | 'suspended';

export class PortalUser {
  readonly id: string;
  readonly clientId: string | null;
  readonly email: string;
  readonly passwordHash: string;
  readonly name: string;
  readonly status: PortalUserStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastLoginAt: Date | null;

  constructor(row: PortalUserRow) {
    this.id = row.id;
    this.clientId = row.clientId;
    this.email = row.email;
    this.passwordHash = row.passwordHash;
    this.name = row.name;
    this.status = row.status as PortalUserStatus;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
    this.lastLoginAt = row.lastLoginAt;
  }

  isActive(): boolean { return this.status === 'active'; }
  isPendingIntake(): boolean { return this.status === 'pending_intake'; }
  isPendingApproval(): boolean { return this.status === 'pending_approval'; }
}
```

- [ ] **Step 6: Create repository `hum-core/src/repositories/portal-user.ts`**

```typescript
import { eq, and, type SQL } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { portalUsers } from '../db/schema.js';
import { PortalUser } from '../models/portal-user.js';
import { NotFoundError } from '../utils/errors.js';
import type * as schema from '../db/schema.js';

type Db = BetterSQLite3Database<typeof schema>;

export async function create(
  db: Db,
  data: {
    email: string;
    passwordHash: string;
    name: string;
    clientId?: string;
    status?: 'pending_intake' | 'pending_approval' | 'active' | 'suspended';
  },
): Promise<PortalUser> {
  const now = new Date();
  const id = uuidv7();

  await db.insert(portalUsers)
    .values({
      id,
      email: data.email,
      passwordHash: data.passwordHash,
      name: data.name,
      clientId: data.clientId ?? null,
      status: data.status ?? 'pending_intake',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    })
    .run();

  const row = await db.select().from(portalUsers).where(eq(portalUsers.id, id)).get();
  return new PortalUser(row!);
}

export async function getById(db: Db, id: string): Promise<PortalUser | undefined> {
  const row = await db.select().from(portalUsers).where(eq(portalUsers.id, id)).get();
  return row ? new PortalUser(row) : undefined;
}

export async function getByEmail(db: Db, email: string): Promise<PortalUser | undefined> {
  const row = await db.select().from(portalUsers).where(eq(portalUsers.email, email)).get();
  return row ? new PortalUser(row) : undefined;
}

export async function update(
  db: Db,
  id: string,
  data: Partial<{
    email: string;
    passwordHash: string;
    name: string;
    clientId: string;
    status: 'pending_intake' | 'pending_approval' | 'active' | 'suspended';
    lastLoginAt: Date;
  }>,
): Promise<PortalUser> {
  await db.update(portalUsers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(portalUsers.id, id))
    .run();

  const row = await db.select().from(portalUsers).where(eq(portalUsers.id, id)).get();
  if (!row) throw new NotFoundError('PortalUser', id);
  return new PortalUser(row);
}

export async function list(
  db: Db,
  filters?: { status?: string },
): Promise<PortalUser[]> {
  const conditions: SQL[] = [];
  if (filters?.status) conditions.push(eq(portalUsers.status, filters.status as any));

  const rows = conditions.length
    ? await db.select().from(portalUsers).where(and(...conditions)).all()
    : await db.select().from(portalUsers).all();

  return rows.map((row) => new PortalUser(row));
}

export async function remove(db: Db, id: string): Promise<void> {
  await db.delete(portalUsers).where(eq(portalUsers.id, id)).run();
}
```

- [ ] **Step 7: Add to repository index**

In `hum-core/src/repositories/index.ts`, add:
```typescript
import * as portalUserRepo from './portal-user.js';
export { portalUserRepo };
```

- [ ] **Step 8: Add Zod schemas to `hum-core/src/schemas/index.ts`**

```typescript
import { portalUsers } from '../db/schema.js';

// ── PortalUser schemas ──────────────────────────────────
export const portalUserSchema = createSelectSchema(portalUsers);
export const createPortalUserSchema = createInsertSchema(portalUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});
export const updatePortalUserSchema = createSelectSchema(portalUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();
```

- [ ] **Step 9: Export from `hum-core/src/index.ts`**

Add to the relevant sections:
```typescript
// Add to schema exports
export { portalUsers } from './db/schema.js';

// Add to model exports
export { PortalUser, type PortalUserRow, type PortalUserStatus } from './models/portal-user.js';

// Add to repository exports (update existing line)
export { clientRepo, brandProfileRepo, socialAccountRepo, contentItemRepo, portalUserRepo } from './repositories/index.js';

// Add to schema exports
export {
  portalUserSchema, createPortalUserSchema, updatePortalUserSchema,
} from './schemas/index.js';
```

- [ ] **Step 10: Run test to verify it passes**

Run: `cd hum-core && pnpm test -- --run src/repositories/__tests__/portal-user.test.ts`
Expected: PASS (all 6 tests)

- [ ] **Step 11: Run full test suite**

Run: `cd hum-core && pnpm test`
Expected: All tests pass (existing 72 + new portal-user tests)

- [ ] **Step 12: Commit**

```bash
git add hum-core/src/db/schema.ts hum-core/src/db/connection.ts hum-core/src/models/portal-user.ts hum-core/src/repositories/portal-user.ts hum-core/src/repositories/__tests__/portal-user.test.ts hum-core/src/repositories/index.ts hum-core/src/schemas/index.ts hum-core/src/index.ts
git commit -m "feat(core): add portal_users schema, model, and repository"
```

---

## Task 2: Add client_uploads schema, model, repository to hum-core

**Files:**
- Modify: `hum-core/src/db/schema.ts`
- Modify: `hum-core/src/db/connection.ts`
- Create: `hum-core/src/models/client-upload.ts`
- Create: `hum-core/src/repositories/client-upload.ts`
- Create: `hum-core/src/repositories/__tests__/client-upload.test.ts`
- Modify: `hum-core/src/repositories/index.ts`
- Modify: `hum-core/src/schemas/index.ts`
- Modify: `hum-core/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `hum-core/src/repositories/__tests__/client-upload.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb } from '../../db/connection.js';
import * as clientUploadRepo from '../client-upload.js';
import * as portalUserRepo from '../portal-user.js';
import { ClientUpload } from '../../models/client-upload.js';

let humDb: HumDb;
let portalUserId: string;

beforeEach(async () => {
  humDb = createDb(':memory:');
  const user = await portalUserRepo.create(humDb.db, {
    email: 'ali@kebabs.com',
    passwordHash: 'hash',
    name: 'Ali',
  });
  portalUserId = user.id;
});

afterEach(() => {
  humDb?.close();
});

describe('clientUploadRepo', () => {
  describe('create', () => {
    it('creates an upload and returns a ClientUpload instance', async () => {
      const upload = await clientUploadRepo.create(humDb.db, {
        portalUserId,
        filename: 'kebab.jpg',
        storagePath: 'media/uploads/user1/abc.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024000,
        category: 'food_photo',
      });
      expect(upload).toBeInstanceOf(ClientUpload);
      expect(upload.id).toBeDefined();
      expect(upload.filename).toBe('kebab.jpg');
      expect(upload.status).toBe('pending');
    });
  });

  describe('listByPortalUserId', () => {
    it('returns uploads for a specific user', async () => {
      await clientUploadRepo.create(humDb.db, {
        portalUserId,
        filename: 'a.jpg',
        storagePath: 'media/uploads/u/a.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 100,
        category: 'food_photo',
      });
      await clientUploadRepo.create(humDb.db, {
        portalUserId,
        filename: 'b.jpg',
        storagePath: 'media/uploads/u/b.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 200,
        category: 'menu',
      });
      const all = await clientUploadRepo.listByPortalUserId(humDb.db, portalUserId);
      expect(all).toHaveLength(2);
    });

    it('filters by category', async () => {
      await clientUploadRepo.create(humDb.db, {
        portalUserId,
        filename: 'a.jpg',
        storagePath: 'p/a.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 100,
        category: 'food_photo',
      });
      await clientUploadRepo.create(humDb.db, {
        portalUserId,
        filename: 'b.pdf',
        storagePath: 'p/b.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 200,
        category: 'menu',
      });
      const menus = await clientUploadRepo.listByPortalUserId(humDb.db, portalUserId, { category: 'menu' });
      expect(menus).toHaveLength(1);
      expect(menus[0].category).toBe('menu');
    });
  });

  describe('update', () => {
    it('updates status', async () => {
      const upload = await clientUploadRepo.create(humDb.db, {
        portalUserId,
        filename: 'a.jpg',
        storagePath: 'p/a.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 100,
        category: 'food_photo',
      });
      const updated = await clientUploadRepo.update(humDb.db, upload.id, { status: 'used' });
      expect(updated.status).toBe('used');
    });
  });

  describe('remove', () => {
    it('deletes the upload', async () => {
      const upload = await clientUploadRepo.create(humDb.db, {
        portalUserId,
        filename: 'a.jpg',
        storagePath: 'p/a.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 100,
        category: 'food_photo',
      });
      await clientUploadRepo.remove(humDb.db, upload.id);
      const found = await clientUploadRepo.getById(humDb.db, upload.id);
      expect(found).toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-core && pnpm test -- --run src/repositories/__tests__/client-upload.test.ts`
Expected: FAIL

- [ ] **Step 3: Add schema to `hum-core/src/db/schema.ts`**

```typescript
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
```

- [ ] **Step 4: Add to pushSchema in `hum-core/src/db/connection.ts`**

```sql
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
```

- [ ] **Step 5: Create model `hum-core/src/models/client-upload.ts`**

```typescript
import { type InferSelectModel } from 'drizzle-orm';
import { type clientUploads } from '../db/schema.js';

export type ClientUploadRow = InferSelectModel<typeof clientUploads>;

export type UploadCategory = 'food_photo' | 'menu' | 'logo' | 'interior' | 'other';
export type UploadStatus = 'pending' | 'used' | 'archived';

export class ClientUpload {
  readonly id: string;
  readonly portalUserId: string;
  readonly filename: string;
  readonly storagePath: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly category: UploadCategory;
  readonly status: UploadStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(row: ClientUploadRow) {
    this.id = row.id;
    this.portalUserId = row.portalUserId;
    this.filename = row.filename;
    this.storagePath = row.storagePath;
    this.mimeType = row.mimeType;
    this.sizeBytes = row.sizeBytes;
    this.category = row.category as UploadCategory;
    this.status = row.status as UploadStatus;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }
}
```

- [ ] **Step 6: Create repository `hum-core/src/repositories/client-upload.ts`**

```typescript
import { eq, and, type SQL } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { clientUploads } from '../db/schema.js';
import { ClientUpload } from '../models/client-upload.js';
import { NotFoundError } from '../utils/errors.js';
import type * as schema from '../db/schema.js';

type Db = BetterSQLite3Database<typeof schema>;

export async function create(
  db: Db,
  data: {
    portalUserId: string;
    filename: string;
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
    category: 'food_photo' | 'menu' | 'logo' | 'interior' | 'other';
  },
): Promise<ClientUpload> {
  const now = new Date();
  const id = uuidv7();

  await db.insert(clientUploads)
    .values({
      id,
      portalUserId: data.portalUserId,
      filename: data.filename,
      storagePath: data.storagePath,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      category: data.category,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const row = await db.select().from(clientUploads).where(eq(clientUploads.id, id)).get();
  return new ClientUpload(row!);
}

export async function getById(db: Db, id: string): Promise<ClientUpload | undefined> {
  const row = await db.select().from(clientUploads).where(eq(clientUploads.id, id)).get();
  return row ? new ClientUpload(row) : undefined;
}

export async function listByPortalUserId(
  db: Db,
  portalUserId: string,
  filters?: { category?: string },
): Promise<ClientUpload[]> {
  const conditions: SQL[] = [eq(clientUploads.portalUserId, portalUserId)];
  if (filters?.category) conditions.push(eq(clientUploads.category, filters.category as any));

  const rows = await db.select().from(clientUploads).where(and(...conditions)).all();
  return rows.map((row) => new ClientUpload(row));
}

export async function update(
  db: Db,
  id: string,
  data: Partial<{
    status: 'pending' | 'used' | 'archived';
  }>,
): Promise<ClientUpload> {
  await db.update(clientUploads)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(clientUploads.id, id))
    .run();

  const row = await db.select().from(clientUploads).where(eq(clientUploads.id, id)).get();
  if (!row) throw new NotFoundError('ClientUpload', id);
  return new ClientUpload(row);
}

export async function remove(db: Db, id: string): Promise<void> {
  await db.delete(clientUploads).where(eq(clientUploads.id, id)).run();
}
```

- [ ] **Step 7: Add to repository index, schemas, and main exports**

Same pattern as Task 1 — add `clientUploadRepo` to `repositories/index.ts`, add Zod schemas to `schemas/index.ts`, add all exports to `index.ts`.

- [ ] **Step 8: Run tests**

Run: `cd hum-core && pnpm test`
Expected: All pass

- [ ] **Step 9: Commit**

```bash
git add hum-core/src/
git commit -m "feat(core): add client_uploads schema, model, and repository"
```

---

## Task 3: Add intake_submissions schema, model, repository to hum-core

**Files:**
- Modify: `hum-core/src/db/schema.ts`
- Modify: `hum-core/src/db/connection.ts`
- Create: `hum-core/src/models/intake-submission.ts`
- Create: `hum-core/src/repositories/intake-submission.ts`
- Create: `hum-core/src/repositories/__tests__/intake-submission.test.ts`
- Modify: `hum-core/src/repositories/index.ts`
- Modify: `hum-core/src/schemas/index.ts`
- Modify: `hum-core/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `hum-core/src/repositories/__tests__/intake-submission.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb } from '../../db/connection.js';
import * as intakeSubmissionRepo from '../intake-submission.js';
import * as portalUserRepo from '../portal-user.js';
import { IntakeSubmission } from '../../models/intake-submission.js';

let humDb: HumDb;
let portalUserId: string;

beforeEach(async () => {
  humDb = createDb(':memory:');
  const user = await portalUserRepo.create(humDb.db, {
    email: 'ali@kebabs.com',
    passwordHash: 'hash',
    name: 'Ali',
  });
  portalUserId = user.id;
});

afterEach(() => {
  humDb?.close();
});

describe('intakeSubmissionRepo', () => {
  describe('create', () => {
    it('creates a submission with draft status', async () => {
      const sub = await intakeSubmissionRepo.create(humDb.db, {
        portalUserId,
        businessName: "Ali's Kebabs",
      });
      expect(sub).toBeInstanceOf(IntakeSubmission);
      expect(sub.status).toBe('draft');
      expect(sub.businessName).toBe("Ali's Kebabs");
    });
  });

  describe('getByPortalUserId', () => {
    it('returns the submission for the user', async () => {
      await intakeSubmissionRepo.create(humDb.db, {
        portalUserId,
        businessName: "Ali's Kebabs",
      });
      const found = await intakeSubmissionRepo.getByPortalUserId(humDb.db, portalUserId);
      expect(found?.businessName).toBe("Ali's Kebabs");
    });

    it('returns undefined when no submission exists', async () => {
      const found = await intakeSubmissionRepo.getByPortalUserId(humDb.db, 'nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('update', () => {
    it('updates draft fields', async () => {
      const sub = await intakeSubmissionRepo.create(humDb.db, {
        portalUserId,
        businessName: "Ali's Kebabs",
      });
      const updated = await intakeSubmissionRepo.update(humDb.db, sub.id, {
        address: '123 High St',
        phone: '07700123456',
        menuData: 'Doner Kebab £7.50, Chicken Shish £8.00',
      });
      expect(updated.address).toBe('123 High St');
      expect(updated.menuData).toBe('Doner Kebab £7.50, Chicken Shish £8.00');
    });

    it('updates status to submitted', async () => {
      const sub = await intakeSubmissionRepo.create(humDb.db, {
        portalUserId,
        businessName: "Ali's Kebabs",
      });
      const updated = await intakeSubmissionRepo.update(humDb.db, sub.id, {
        status: 'submitted',
        submittedAt: new Date(),
      });
      expect(updated.status).toBe('submitted');
      expect(updated.submittedAt).toBeDefined();
    });
  });

  describe('listByStatus', () => {
    it('filters by status', async () => {
      const sub = await intakeSubmissionRepo.create(humDb.db, {
        portalUserId,
        businessName: "Ali's Kebabs",
      });
      await intakeSubmissionRepo.update(humDb.db, sub.id, { status: 'submitted', submittedAt: new Date() });

      const submitted = await intakeSubmissionRepo.listByStatus(humDb.db, 'submitted');
      expect(submitted).toHaveLength(1);

      const drafts = await intakeSubmissionRepo.listByStatus(humDb.db, 'draft');
      expect(drafts).toHaveLength(0);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-core && pnpm test -- --run src/repositories/__tests__/intake-submission.test.ts`
Expected: FAIL

- [ ] **Step 3: Add schema**

In `hum-core/src/db/schema.ts`:

```typescript
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
```

- [ ] **Step 4: Add to pushSchema, create model, repository, schemas, exports**

Follow same pattern as Tasks 1 and 2. Key differences:
- Model: `IntakeSubmission` with properties matching schema
- Repository methods: `create`, `getById`, `getByPortalUserId`, `update`, `listByStatus`, `remove`
- `getByPortalUserId` uses `eq(intakeSubmissions.portalUserId, portalUserId)`
- `listByStatus` uses `eq(intakeSubmissions.status, status)`

- [ ] **Step 5: Run tests**

Run: `cd hum-core && pnpm test`
Expected: All pass

- [ ] **Step 6: Generate migration**

Run: `cd hum-core && pnpm db:generate`

This creates a new migration file in `src/db/migrations/` for all three new tables.

- [ ] **Step 7: Build hum-core**

Run: `cd hum-core && pnpm build`
Expected: Clean build, migrations copied to dist/

- [ ] **Step 8: Commit**

```bash
git add hum-core/
git commit -m "feat(core): add intake_submissions schema, model, repository + migration"
```

---

## Task 4: Add SocialConnectClient interface to hum-integrations

**Files:**
- Create: `hum-integrations/src/social/connect-types.ts`
- Modify: `hum-integrations/src/social/ayrshare.ts`
- Create: `hum-integrations/src/social/ayrshare-connect.mock.ts`
- Create: `hum-integrations/src/social/__tests__/ayrshare-connect.test.ts`
- Modify: `hum-integrations/src/social/index.ts`
- Modify: `hum-integrations/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `hum-integrations/src/social/__tests__/ayrshare-connect.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { MockAyrshareConnectProvider } from '../ayrshare-connect.mock.js';

describe('MockAyrshareConnectProvider', () => {
  const provider = new MockAyrshareConnectProvider();

  describe('createProfile', () => {
    it('returns a profile key', async () => {
      const result = await provider.createProfile({ title: "Ali's Kebabs" });
      expect(result.profileKey).toBeDefined();
      expect(typeof result.profileKey).toBe('string');
    });
  });

  describe('getConnectUrl', () => {
    it('returns a URL containing the platform and callback', async () => {
      const result = await provider.getConnectUrl(
        'mock-profile-key',
        'instagram',
        'http://localhost:3200/api/connect/callback',
      );
      expect(result.url).toContain('instagram');
      expect(result.url).toContain('callback');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hum-integrations && pnpm test -- --run src/social/__tests__/ayrshare-connect.test.ts`
Expected: FAIL

- [ ] **Step 3: Create `hum-integrations/src/social/connect-types.ts`**

```typescript
import type { Platform } from 'hum-core';

export interface SocialConnectClient {
  createProfile(input: { title: string }): Promise<{ profileKey: string }>;
  getConnectUrl(profileKey: string, platform: Platform, callbackUrl: string): Promise<{ url: string }>;
}
```

- [ ] **Step 4: Create mock `hum-integrations/src/social/ayrshare-connect.mock.ts`**

```typescript
import type { SocialConnectClient } from './connect-types.js';
import type { Platform } from 'hum-core';

export class MockAyrshareConnectProvider implements SocialConnectClient {
  async createProfile(input: { title: string }): Promise<{ profileKey: string }> {
    return { profileKey: `mock-profile-${Date.now()}` };
  }

  async getConnectUrl(
    profileKey: string,
    platform: Platform,
    callbackUrl: string,
  ): Promise<{ url: string }> {
    const params = new URLSearchParams({
      profileKey,
      platform,
      callbackUrl,
    });
    return { url: `http://localhost:9999/mock-connect?${params.toString()}` };
  }
}
```

- [ ] **Step 5: Add real implementation to `AyrshareProvider`**

Add these methods to the existing `AyrshareProvider` class in `hum-integrations/src/social/ayrshare.ts`. The class should also implement `SocialConnectClient`:

```typescript
import type { SocialConnectClient } from './connect-types.js';

// Update class declaration:
export class AyrshareProvider implements SocialClient, SocialConnectClient {
  // ... existing methods ...

  async createProfile(input: { title: string }): Promise<{ profileKey: string }> {
    const data = await this.request<{ profileKey: string }>('POST', '/profiles', {
      title: input.title,
    });
    return { profileKey: data.profileKey };
  }

  async getConnectUrl(
    profileKey: string,
    platform: Platform,
    callbackUrl: string,
  ): Promise<{ url: string }> {
    const data = await this.request<{ url: string }>(
      'POST',
      `/profiles/${profileKey}/connect`,
      { platform, callbackUrl },
    );
    return { url: data.url };
  }
}
```

- [ ] **Step 6: Update `hum-integrations/src/social/index.ts`**

Add exports and factory for connect client:

```typescript
export type { SocialConnectClient } from './connect-types.js';
import { MockAyrshareConnectProvider } from './ayrshare-connect.mock.js';

export function createSocialConnectClient(config?: { mock?: boolean; apiKey?: string }): SocialConnectClient {
  const useMock = config?.mock ?? process.env.HUM_MOCK_INTEGRATIONS === 'true';
  if (useMock) {
    return new MockAyrshareConnectProvider();
  }
  return new AyrshareProvider({ apiKey: config?.apiKey });
}
```

- [ ] **Step 7: Update `hum-integrations/src/index.ts`**

```typescript
export { createSocialConnectClient } from './social/index.js';
export type { SocialConnectClient } from './social/index.js';
```

- [ ] **Step 8: Run tests**

Run: `cd hum-integrations && pnpm test`
Expected: All pass (existing 33 + new connect tests)

- [ ] **Step 9: Build and commit**

```bash
cd hum-integrations && pnpm build
git add hum-integrations/src/
git commit -m "feat(integrations): add SocialConnectClient interface for Ayrshare OAuth"
```

---

## Task 5: Scaffold hum-client-portal Next.js app

**Files:**
- Create: `hum-client-portal/package.json`
- Create: `hum-client-portal/next.config.ts`
- Create: `hum-client-portal/tailwind.config.ts`
- Create: `hum-client-portal/tsconfig.json`
- Create: `hum-client-portal/postcss.config.mjs`
- Create: `hum-client-portal/src/app/globals.css`
- Create: `hum-client-portal/src/app/layout.tsx`
- Create: `hum-client-portal/src/app/providers.tsx`
- Create: `hum-client-portal/src/lib/db.ts`
- Create: `hum-client-portal/src/lib/constants.ts`
- Create: `hum-client-portal/src/lib/auth.ts`
- Create: `hum-client-portal/src/lib/api.ts`
- Create: `hum-client-portal/src/lib/queries.ts`
- Create: `hum-client-portal/src/types/index.ts`
- Create: `hum-client-portal/src/middleware.ts`
- Modify: `pnpm-workspace.yaml`
- Modify: `package.json` (root — add portal to dev script)

- [ ] **Step 1: Create `hum-client-portal/package.json`**

```json
{
  "name": "hum-client-portal",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3200",
    "build": "next build",
    "start": "next start -p 3200",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@tanstack/react-query": "^5.60.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.6.0",
    "lucide-react": "^0.460.0",
    "bcryptjs": "^2.4.3",
    "hum-core": "workspace:*",
    "hum-integrations": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/react": "^19.0.0",
    "@types/node": "^22.0.0",
    "@types/bcryptjs": "^2.4.6",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create config files**

`next.config.ts` — same as dashboard but also externalize hum-integrations:
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'hum-core', 'hum-integrations'],
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals = [...(config.externals || []), 'hum-core', 'hum-integrations'];
    }
    return config;
  },
};

export default nextConfig;
```

`tailwind.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `src/app/globals.css` — identical to dashboard.

- [ ] **Step 3: Create `src/lib/db.ts`**

Identical to dashboard's `lib/db.ts`.

- [ ] **Step 4: Create `src/lib/constants.ts`**

Separate file with no hum-core imports — safe for Edge runtime middleware:

```typescript
export const COOKIE_NAME = 'hum-portal-auth';
```

- [ ] **Step 5: Create `src/lib/auth.ts`**

```typescript
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { portalUserRepo, type PortalUser } from 'hum-core';
import { db } from '@/lib/db';
import { COOKIE_NAME } from '@/lib/constants';

export { COOKIE_NAME };

export async function getPortalUser(): Promise<PortalUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;

  const user = await portalUserRepo.getById(db, cookie.value);
  return user ?? null;
}

export async function verifyAuth(): Promise<boolean> {
  const user = await getPortalUser();
  return user !== null;
}

export function setAuthCookie(response: NextResponse, portalUserId: string): NextResponse {
  response.cookies.set(COOKIE_NAME, portalUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return response;
}

export function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.delete(COOKIE_NAME);
  return response;
}
```

- [ ] **Step 6: Create `src/middleware.ts`**

**IMPORTANT:** Middleware imports `COOKIE_NAME` from `@/lib/constants` (NOT `@/lib/auth`) because middleware runs on the Edge runtime and cannot import `hum-core`/`better-sqlite3`. The middleware also injects `x-next-pathname` header so the layout can read the current path for status-based routing.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/constants';

const PUBLIC_PATHS = ['/login', '/signup', '/api/auth/login', '/api/auth/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(COOKIE_NAME);
  if (cookie?.value) {
    // Inject pathname header for layout status-based routing
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-next-pathname', pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 7: Create `src/app/layout.tsx` with status-based routing**

```typescript
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { getPortalUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export const metadata: Metadata = {
  title: 'Hum — Your Marketing Portal',
  description: 'View your content, upload photos, manage your account',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getPortalUser();
  const headersList = await headers();
  const pathname = headersList.get('x-next-pathname') ?? '';

  // Status-based routing enforcement
  if (user) {
    const publicPaths = ['/login', '/signup'];
    if (publicPaths.some((p) => pathname.startsWith(p))) {
      if (user.isPendingIntake()) redirect('/intake');
      if (user.isPendingApproval()) redirect('/waiting');
      redirect('/');
    }

    if (user.status === 'suspended' && pathname !== '/suspended') {
      redirect('/suspended');
    }
    if (user.isPendingApproval() && pathname !== '/waiting') {
      redirect('/waiting');
    }
    if (user.isPendingIntake() && !pathname.startsWith('/intake')) {
      redirect('/intake');
    }
  }

  return (
    <html lang="en">
      <body className="bg-white text-gray-900 min-h-screen antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Create `src/app/providers.tsx`**

Same as dashboard but with `refetchInterval: 60_000` (clients don't need aggressive polling).

- [ ] **Step 9: Create `src/types/index.ts` and `src/lib/api.ts` and `src/lib/queries.ts`**

Start with minimal stubs — these get populated as pages are built in later tasks.

`src/types/index.ts`:
```typescript
export type PortalUserStatus = 'pending_intake' | 'pending_approval' | 'active' | 'suspended';
```

`src/lib/api.ts`:
```typescript
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}
```

`src/lib/queries.ts`:
```typescript
// Query hooks added in later tasks as pages are built
export const QUERY_KEYS = {} as const;
```

- [ ] **Step 10: Update `pnpm-workspace.yaml`**

Add `"hum-client-portal"` to the packages list.

- [ ] **Step 11: Install dependencies**

Run: `pnpm install`

- [ ] **Step 12: Verify dev server starts**

Run: `cd hum-core && pnpm build && cd ../hum-integrations && pnpm build && cd ../hum-client-portal && pnpm dev`
Expected: Next.js dev server starts on port 3200

- [ ] **Step 13: Commit**

```bash
git add hum-client-portal/ pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "feat(client-portal): scaffold Next.js app with auth and status-based routing"
```

---

## Task 6: Auth API routes (signup + login + logout)

**Files:**
- Create: `hum-client-portal/src/app/api/auth/signup/route.ts`
- Create: `hum-client-portal/src/app/api/auth/login/route.ts`
- Create: `hum-client-portal/src/app/api/auth/logout/route.ts`
- Create: `hum-client-portal/src/app/signup/page.tsx`
- Create: `hum-client-portal/src/app/login/page.tsx`

- [ ] **Step 1: Create signup API route**

`src/app/api/auth/signup/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { portalUserRepo } from 'hum-core';
import { db } from '@/lib/db';
import { setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email, password, name } = body;
  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
  }

  const existing = await portalUserRepo.getByEmail(db, email);
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await portalUserRepo.create(db, { email, passwordHash, name });

  const response = NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
  return setAuthCookie(response, user.id);
}
```

- [ ] **Step 2: Create login API route**

`src/app/api/auth/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { portalUserRepo } from 'hum-core';
import { db } from '@/lib/db';
import { setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const user = await portalUserRepo.getByEmail(db, email);
  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  await portalUserRepo.update(db, user.id, { lastLoginAt: new Date() });

  const response = NextResponse.json({ ok: true });
  return setAuthCookie(response, user.id);
}
```

- [ ] **Step 3: Create logout API route**

`src/app/api/auth/logout/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  return clearAuthCookie(response);
}
```

- [ ] **Step 4: Create signup page**

`src/app/signup/page.tsx` — client component with email/password/name form, calls POST /api/auth/signup, on success redirects to /intake. Mobile-first styling: centered card, large inputs, large submit button. Link to /login at bottom.

- [ ] **Step 5: Create login page**

`src/app/login/page.tsx` — client component with email/password form, calls POST /api/auth/login, on success redirects based on status (router.refresh()). Link to /signup at bottom.

- [ ] **Step 6: Verify manually**

Start dev server, navigate to http://localhost:3200/signup. Create account. Should redirect to /intake (which will 404 for now — that's expected).

- [ ] **Step 7: Commit**

```bash
git add hum-client-portal/src/app/api/auth/ hum-client-portal/src/app/signup/ hum-client-portal/src/app/login/
git commit -m "feat(client-portal): add auth API routes and signup/login pages"
```

---

## Task 7: Intake form (multi-step) + API routes

**Files:**
- Create: `hum-client-portal/src/app/intake/page.tsx`
- Create: `hum-client-portal/src/app/api/intake/route.ts`
- Create: `hum-client-portal/src/app/api/intake/submit/route.ts`
- Create: `hum-client-portal/src/app/api/upload/route.ts`
- Create: `hum-client-portal/src/app/api/upload/[id]/file/route.ts`
- Create: `hum-client-portal/src/components/intake/step-business.tsx`
- Create: `hum-client-portal/src/components/intake/step-menu.tsx`
- Create: `hum-client-portal/src/components/intake/step-photos.tsx`
- Create: `hum-client-portal/src/components/intake/step-social.tsx`
- Create: `hum-client-portal/src/components/intake/step-brand.tsx`
- Create: `hum-client-portal/src/components/intake/progress-bar.tsx`
- Create: `hum-client-portal/src/components/photo-uploader.tsx`

- [ ] **Step 1: Create upload API route**

`src/app/api/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { clientUploadRepo } from 'hum-core';
import { db } from '@/lib/db';
import { getPortalUser } from '@/lib/auth';
import { uuidv7 } from 'uuidv7';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];

export async function POST(request: NextRequest) {
  const user = await getPortalUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const category = formData.get('category') as string | null;

  if (!file || !category) {
    return NextResponse.json({ error: 'File and category are required' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `File type ${file.type} not allowed` }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
  }

  const id = uuidv7();
  const ext = file.name.split('.').pop() || 'bin';
  const dir = path.join(process.cwd(), 'media', 'uploads', user.id);
  const storagePath = path.join(dir, `${id}.${ext}`);

  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(storagePath, buffer);

  const upload = await clientUploadRepo.create(db, {
    portalUserId: user.id,
    filename: file.name,
    storagePath: `media/uploads/${user.id}/${id}.${ext}`,
    mimeType: file.type,
    sizeBytes: file.size,
    category: category as any,
  });

  return NextResponse.json(upload, { status: 201 });
}

export async function GET(request: NextRequest) {
  const user = await getPortalUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') ?? undefined;
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);

  const all = await clientUploadRepo.listByPortalUserId(db, user.id, { category });
  const offset = (page - 1) * limit;
  const items = all.slice(offset, offset + limit);

  return NextResponse.json({ items, total: all.length, page, limit });
}
```

Also create a **file-serving route** `src/app/api/upload/[id]/file/route.ts` so uploaded images can be rendered as thumbnails:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { clientUploadRepo } from 'hum-core';
import { db } from '@/lib/db';
import { getPortalUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getPortalUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const upload = await clientUploadRepo.getById(db, id);
  if (!upload || upload.portalUserId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), upload.storagePath);
  const buffer = await readFile(filePath);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': upload.mimeType,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
```

- [ ] **Step 2: Create intake API routes**

`src/app/api/intake/route.ts` — GET returns current draft (joins client_uploads for full metadata), PUT saves draft fields.

`src/app/api/intake/submit/route.ts` — POST does:
1. Load the intake submission for the current portal_user
2. **Validate `menuData` is non-empty** (required per spec — if null, return 400 with "Menu information is required")
3. **Validate `businessName` is non-empty**
4. Set intake status to `submitted`, `submittedAt` to now
5. Update portal_user status to `pending_approval`

- [ ] **Step 3: Create intake step components**

Each step is a separate component receiving `data`, `onUpdate`, and `onNext` props:

- `step-business.tsx` — business name, address, phone, opening hours
- `step-menu.tsx` — textarea for menu text + photo uploader for menu images
- `step-photos.tsx` — photo uploader for food photos (5-10)
- `step-social.tsx` — text inputs for Instagram URL, Facebook URL, TikTok URL, Google Business URL
- `step-brand.tsx` — textarea for brand preferences (optional)
- `progress-bar.tsx` — shows current step / total steps

`photo-uploader.tsx` — reusable component with file input (accept images), drag-drop zone, camera capture on mobile (accept="image/*" capture="environment"), grid of uploaded thumbnails.

- [ ] **Step 4: Create intake page**

`src/app/intake/page.tsx` — client component managing step state (1-5). Loads existing draft from GET /api/intake. Saves to PUT /api/intake on each step change. Final step calls POST /api/intake/submit.

- [ ] **Step 5: Verify manually**

Sign up as new user → should land on /intake → fill in steps → submit → should redirect to /waiting.

- [ ] **Step 6: Commit**

```bash
git add hum-client-portal/src/
git commit -m "feat(client-portal): add multi-step intake form with upload"
```

---

## Task 8: Waiting and suspended pages

**Files:**
- Create: `hum-client-portal/src/app/waiting/page.tsx`
- Create: `hum-client-portal/src/app/suspended/page.tsx`

- [ ] **Step 1: Create waiting page**

`src/app/waiting/page.tsx` — simple server component. Shows business name, "We're reviewing your application" message, and estimated timeframe. No interactivity.

- [ ] **Step 2: Create suspended page**

`src/app/suspended/page.tsx` — "Your account has been suspended. Please contact support."

- [ ] **Step 3: Commit**

```bash
git add hum-client-portal/src/app/waiting/ hum-client-portal/src/app/suspended/
git commit -m "feat(client-portal): add waiting and suspended status pages"
```

---

## Task 9: Active portal — home page with content preview

**Files:**
- Create: `hum-client-portal/src/app/(portal)/layout.tsx`
- Create: `hum-client-portal/src/app/(portal)/page.tsx`
- Create: `hum-client-portal/src/app/api/content/route.ts`
- Create: `hum-client-portal/src/components/portal-nav.tsx`
- Create: `hum-client-portal/src/components/content-card.tsx`

- [ ] **Step 1: Create portal layout with top nav**

`src/app/(portal)/layout.tsx` — server component. Gets portal user, verifies status is `active`. Top nav bar with business name (from brand profile or client record) + hamburger menu linking to /content, /upload, /account, /connect. Mobile-first: sticky top nav, full-width content below.

- [ ] **Step 2: Create content API route**

`src/app/api/content/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { contentItemRepo } from 'hum-core';
import { db } from '@/lib/db';
import { getPortalUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getPortalUser();
  if (!user?.clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? undefined;
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);

  const allItems = await contentItemRepo.list(db, {
    clientId: user.clientId,
    status: status as any,
  });

  // Manual pagination (hum-core list doesn't support offset/limit yet)
  const offset = (page - 1) * limit;
  const items = allItems.slice(offset, offset + limit);

  return NextResponse.json({
    items,
    total: allItems.length,
    page,
    limit,
  });
}
```

- [ ] **Step 3: Create content card component**

`src/components/content-card.tsx` — shows image thumbnail (or placeholder), caption preview (truncated), platform icons, scheduled date. Mobile card layout.

- [ ] **Step 4: Create home page**

`src/app/(portal)/page.tsx` — client component. Horizontal scrolling section of upcoming content cards (status: scheduled). "Upload Photos" CTA button (links to /upload). Quick links to /content and /account.

- [ ] **Step 5: Add React Query hooks**

Update `src/lib/api.ts` and `src/lib/queries.ts` with content fetching hooks.

- [ ] **Step 6: Commit**

```bash
git add hum-client-portal/src/
git commit -m "feat(client-portal): add home page with content preview and portal nav"
```

---

## Task 10: Content list page

**Files:**
- Create: `hum-client-portal/src/app/(portal)/content/page.tsx`

- [ ] **Step 1: Create content page**

`src/app/(portal)/content/page.tsx` — client component. Filter tabs: Upcoming (scheduled) / Posted. Grid of content cards (reuse content-card component). Paginated (20 per page) with "Load more" button. Mobile-first grid (1 col on small screens, 2 col on medium+).

- [ ] **Step 2: Commit**

```bash
git add hum-client-portal/src/app/\(portal\)/content/
git commit -m "feat(client-portal): add content list page with filter tabs"
```

---

## Task 11: Photo upload page

**Files:**
- Create: `hum-client-portal/src/app/(portal)/upload/page.tsx`

- [ ] **Step 1: Create upload page**

`src/app/(portal)/upload/page.tsx` — client component. Reuses `photo-uploader.tsx` from intake. Category fixed to `food_photo`. Shows grid of previously uploaded photos with status badges (pending/used). Upload new photos button + drag-drop zone.

- [ ] **Step 2: Commit**

```bash
git add hum-client-portal/src/app/\(portal\)/upload/
git commit -m "feat(client-portal): add photo upload page"
```

---

## Task 12: Account page

**Files:**
- Create: `hum-client-portal/src/app/(portal)/account/page.tsx`
- Create: `hum-client-portal/src/app/api/account/route.ts`
- Create: `hum-client-portal/src/components/social-status.tsx`

- [ ] **Step 1: Create account API route**

`src/app/api/account/route.ts` — returns client record (plan tier, business name), brand profile, social accounts with connection status.

- [ ] **Step 2: Create social status component**

`src/components/social-status.tsx` — displays platform name, status dot (green=connected, red=disconnected/expired), "Reconnect" link to /connect if not connected.

- [ ] **Step 3: Create account page**

`src/app/(portal)/account/page.tsx` — stacked sections:
1. Plan info (tier name, mock "Manage Billing" link)
2. Connected social accounts (list with status dots + reconnect buttons)
3. Logout button

- [ ] **Step 4: Commit**

```bash
git add hum-client-portal/src/app/\(portal\)/account/ hum-client-portal/src/app/api/account/ hum-client-portal/src/components/social-status.tsx
git commit -m "feat(client-portal): add account page with plan info and social status"
```

---

## Task 13: Ayrshare social connect page

**Files:**
- Create: `hum-client-portal/src/app/(portal)/connect/page.tsx`
- Create: `hum-client-portal/src/app/api/connect/[platform]/route.ts`
- Create: `hum-client-portal/src/app/api/connect/callback/route.ts`

- [ ] **Step 1: Create connect initiation API route**

`src/app/api/connect/[platform]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { socialAccountRepo, clientRepo } from 'hum-core';
import { createSocialConnectClient } from 'hum-integrations';
import { db } from '@/lib/db';
import { getPortalUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const user = await getPortalUser();
  if (!user?.clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { platform } = await params;
  const validPlatforms = ['instagram', 'facebook', 'tiktok', 'google_business'];
  if (!validPlatforms.includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  const client = await clientRepo.getById(db, user.clientId);
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const connectClient = createSocialConnectClient();

  // Check if client already has an Ayrshare profile
  const existingAccounts = await socialAccountRepo.listByClientId(db, user.clientId);
  let profileKey = existingAccounts.find((a) => a.ayrshareProfileKey)?.ayrshareProfileKey;

  if (!profileKey) {
    const profile = await connectClient.createProfile({ title: client.businessName });
    profileKey = profile.profileKey;
  }

  const callbackUrl = `${request.nextUrl.origin}/api/connect/callback`;
  const { url } = await connectClient.getConnectUrl(profileKey, platform as any, callbackUrl);

  return NextResponse.json({ url, profileKey });
}
```

- [ ] **Step 2: Create callback API route**

`src/app/api/connect/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { socialAccountRepo } from 'hum-core';
import { db } from '@/lib/db';
import { getPortalUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getPortalUser();
  if (!user?.clientId) return NextResponse.redirect(new URL('/login', request.url));

  const { searchParams } = new URL(request.url);
  const profileKey = searchParams.get('profileKey');
  const platform = searchParams.get('platform');
  const status = searchParams.get('status');

  if (status === 'success' && profileKey && platform) {
    const platformAccountId = searchParams.get('accountId') || profileKey;

    // Check for existing account (reconnect case) — update instead of create
    const existing = await socialAccountRepo.listByClientId(db, user.clientId);
    const existingAccount = existing.find((a) => a.platform === platform);

    if (existingAccount) {
      await socialAccountRepo.update(db, existingAccount.id, {
        ayrshareProfileKey: profileKey,
        platformAccountId,
        status: 'connected',
      });
    } else {
      await socialAccountRepo.create(db, {
        clientId: user.clientId,
        platform: platform as any,
        platformAccountId,
        ayrshareProfileKey: profileKey,
        status: 'connected',
      });
    }
  }

  return NextResponse.redirect(new URL('/connect?result=' + (status ?? 'unknown'), request.url));
}
```

- [ ] **Step 3: Create connect page**

`src/app/(portal)/connect/page.tsx` — client component. Lists platforms (Instagram, Facebook, TikTok, Google Business). For each: shows "Connected" with green dot if a social_account exists, or "Connect" button. Clicking "Connect" calls POST /api/connect/[platform], gets URL, and window.location redirects. Shows success/error message from callback query param.

- [ ] **Step 4: Commit**

```bash
git add hum-client-portal/src/app/\(portal\)/connect/ hum-client-portal/src/app/api/connect/
git commit -m "feat(client-portal): add Ayrshare social connect flow"
```

---

## Task 14: Add intake review to operator dashboard

**Prerequisites:** Add `hum-onboarding` and `hum-integrations` as workspace dependencies of `hum-dashboard`, and externalize them in `next.config.ts`.

**Files:**
- Modify: `hum-dashboard/package.json` (add `hum-onboarding: "workspace:*"`, `hum-integrations: "workspace:*"`)
- Modify: `hum-dashboard/next.config.ts` (add to `serverExternalPackages` and webpack externals)
- Create: `hum-dashboard/src/app/intake/page.tsx`
- Create: `hum-dashboard/src/app/api/intake/route.ts`
- Create: `hum-dashboard/src/app/api/intake/[id]/approve/route.ts`
- Create: `hum-dashboard/src/app/api/intake/[id]/reject/route.ts`
- Create: `hum-dashboard/src/components/intake-card.tsx`
- Modify: `hum-dashboard/src/components/sidebar.tsx` (add Intake nav link)

- [ ] **Step 1: Add dependencies to hum-dashboard**

Add to `hum-dashboard/package.json` dependencies:
```json
"hum-onboarding": "workspace:*",
"hum-integrations": "workspace:*"
```

Update `hum-dashboard/next.config.ts`:
```typescript
serverExternalPackages: ['better-sqlite3', 'hum-core', 'hum-onboarding', 'hum-integrations'],
// and in webpack externals:
config.externals = [...(config.externals || []), 'hum-core', 'hum-onboarding', 'hum-integrations'];
```

Run: `pnpm install`

- [ ] **Step 2: Create intake list API route**

`src/app/api/intake/route.ts` — GET returns intake_submissions joined with portal_users (email, name). Filters by status (default: submitted).

- [ ] **Step 3: Create approve API route**

`src/app/api/intake/[id]/approve/route.ts` — POST with body `{ planTier?, cuisineType?, ... }`. Does:
1. Load intake_submission and portal_user
2. Map to IntakeData shape (email from portal_user, menu from menuData, socialAccounts: [])
3. Construct `IntegrationClients` — the third arg `startOnboarding` requires:
```typescript
import { createAiClient, createSocialClient } from 'hum-integrations';
import { createStubContentEngine } from 'hum-onboarding';
import { startOnboarding, type IntegrationClients } from 'hum-onboarding';

const integrations: IntegrationClients = {
  ai: createAiClient(),
  contentEngine: createStubContentEngine(),
};
```
4. Try `startOnboarding(db, intakeData, integrations)` — catch `DuplicateError` if client/session already exists (reject-then-reapprove edge case). On duplicate, look up existing client by email and reuse.
5. Extract `session.clientId` from the returned `OnboardingSession`
6. Update portal_user: `clientId = session.clientId`, `status = 'active'`
7. Update intake_submission: `status = 'approved'`, `reviewedAt = now`

- [ ] **Step 4: Create reject API route**

`src/app/api/intake/[id]/reject/route.ts` — POST with body `{ reviewNotes }`. Updates intake_submission to `rejected`, portal_user status back to `pending_intake`.

- [ ] **Step 5: Create intake card component**

Displays business name, email, phone, social links, uploaded photos (thumbnails via `/api/upload/[id]/file` on the portal — note: dashboard may need its own file-serving route or a shared media path), menu text preview. Approve/Reject buttons.

- [ ] **Step 6: Create intake page**

`src/app/intake/page.tsx` — lists pending submissions. Each rendered as intake-card with approve/reject actions.

- [ ] **Step 7: Add to sidebar**

Add "Intake" link to sidebar navigation (between Clients and Content, or after Issues).

- [ ] **Step 8: Build onboarding + integrations deps and verify**

Run: `cd hum-onboarding && pnpm build && cd ../hum-integrations && pnpm build`

- [ ] **Step 9: Commit**

```bash
git add hum-dashboard/
git commit -m "feat(dashboard): add intake review page for operator approval"
```

---

## Task 15: Update root dev script and verify end-to-end

**Files:**
- Modify: `package.json` (root)
- Modify: `hum-client-portal/DESIGN.md` (update to reflect what was built)

- [ ] **Step 1: Update root dev script**

Add portal to the concurrently command in root `package.json`:

```json
"dev": "pnpm --filter hum-core build && pnpm --filter hum-integrations build && concurrently -n core,intg,dash,portal -c blue,cyan,green,magenta \"pnpm --filter hum-core build:watch\" \"pnpm --filter hum-integrations build:watch\" \"pnpm --filter hum-dashboard dev\" \"pnpm --filter hum-client-portal dev\""
```

- [ ] **Step 2: End-to-end verification**

Run: `pnpm dev`

Verify the full flow:
1. Go to http://localhost:3200/signup → create account
2. Fill in intake form → submit
3. Go to http://localhost:3100 (dashboard) → see intake submission → approve
4. Back to http://localhost:3200 → now see active portal with content preview
5. Upload a photo → appears in upload list
6. Check account page → shows plan and social accounts

- [ ] **Step 3: Update MVP_BUILD_SEQUENCE.md**

Mark hum-client-portal as complete, update statuses of other packages.

- [ ] **Step 4: Run all tests**

Run: `pnpm test`
Expected: All packages pass

- [ ] **Step 5: Commit**

```bash
git add package.json MVP_BUILD_SEQUENCE.md hum-client-portal/DESIGN.md
git commit -m "feat: integrate client portal into dev workflow, verify end-to-end"
```

---

## Known Limitations / Post-MVP Tech Debt

- **No automated tests for portal API routes/pages** — Tasks 6-13 rely on manual verification. Auth routes and approval flow are the highest priority for future integration tests.
- **HEIC uploads accepted but not rendered** — HEIC images cannot be displayed natively in most browsers. Post-MVP: add server-side HEIC-to-JPEG conversion on upload.
- **Cookie contains raw portalUserId** — no HMAC signing or tamper protection. Add signing before any real-world deployment.
- **No real Stripe billing integration** — mock link only.
- **No metrics/analytics** — deferred.
- **Reviews page** — placeholder only, no data source until hum-engagement is built.
