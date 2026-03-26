import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { HumDb } from '../db/connection.js';
import { socialAccounts } from '../db/schema.js';
import { SocialAccount } from '../models/social-account.js';
import { NotFoundError } from '../utils/errors.js';

type Db = HumDb['db'];

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
  const now = Date.now();
  const id = uuidv7();

  await db.insert(socialAccounts)
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
    .execute();

  const row = (await db.select().from(socialAccounts).where(eq(socialAccounts.id, id)))[0];
  return new SocialAccount(row!);
}

export async function getById(db: Db, id: string): Promise<SocialAccount | undefined> {
  const row = (await db.select().from(socialAccounts).where(eq(socialAccounts.id, id)))[0];
  return row ? new SocialAccount(row) : undefined;
}

export async function listByClientId(db: Db, clientId: string): Promise<SocialAccount[]> {
  const rows = await db.select().from(socialAccounts).where(eq(socialAccounts.clientId, clientId));
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
    connectedAt: number;
  }>,
): Promise<SocialAccount> {
  await db.update(socialAccounts)
    .set({ ...data, updatedAt: Date.now() })
    .where(eq(socialAccounts.id, id))
    .execute();

  const row = (await db.select().from(socialAccounts).where(eq(socialAccounts.id, id)))[0];
  if (!row) throw new NotFoundError('SocialAccount', id);
  return new SocialAccount(row);
}

export async function remove(db: Db, id: string): Promise<void> {
  await db.delete(socialAccounts).where(eq(socialAccounts.id, id)).execute();
}
