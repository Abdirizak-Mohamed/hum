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
