import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { socialAccounts } from '../db/schema.js';
import { SocialAccount } from '../models/social-account.js';
import { NotFoundError } from '../utils/errors.js';
import type * as schema from '../db/schema.js';

type Db = BetterSQLite3Database<typeof schema>;

export async function create(
  db: Db,
  data: {
    clientId: string;
    platform: 'instagram' | 'facebook' | 'tiktok' | 'google_business';
    platformAccountId: string;
    ayrshareProfileKey?: string;
    status?: 'connected' | 'disconnected' | 'expired';
  },
): Promise<SocialAccount> {
  const now = new Date();
  const id = uuidv7();

  db.insert(socialAccounts)
    .values({
      id,
      clientId: data.clientId,
      platform: data.platform,
      platformAccountId: data.platformAccountId,
      ayrshareProfileKey: data.ayrshareProfileKey ?? null,
      status: data.status ?? 'disconnected',
      createdAt: now,
      connectedAt: null,
      updatedAt: now,
    })
    .run();

  const row = db.select().from(socialAccounts).where(eq(socialAccounts.id, id)).get();
  return new SocialAccount(row!);
}

export async function getById(db: Db, id: string): Promise<SocialAccount | undefined> {
  const row = db.select().from(socialAccounts).where(eq(socialAccounts.id, id)).get();
  return row ? new SocialAccount(row) : undefined;
}

export async function listByClientId(db: Db, clientId: string): Promise<SocialAccount[]> {
  const rows = db.select().from(socialAccounts).where(eq(socialAccounts.clientId, clientId)).all();
  return rows.map((row) => new SocialAccount(row));
}

export async function update(
  db: Db,
  id: string,
  data: Partial<{
    platform: 'instagram' | 'facebook' | 'tiktok' | 'google_business';
    platformAccountId: string;
    ayrshareProfileKey: string;
    status: 'connected' | 'disconnected' | 'expired';
    connectedAt: Date;
  }>,
): Promise<SocialAccount> {
  db.update(socialAccounts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(socialAccounts.id, id))
    .run();

  const row = db.select().from(socialAccounts).where(eq(socialAccounts.id, id)).get();
  if (!row) throw new NotFoundError('SocialAccount', id);
  return new SocialAccount(row);
}

export async function remove(db: Db, id: string): Promise<void> {
  db.delete(socialAccounts).where(eq(socialAccounts.id, id)).run();
}
