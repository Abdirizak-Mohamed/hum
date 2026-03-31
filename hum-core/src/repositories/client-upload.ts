import { eq, and, type SQL } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { clientUploads } from '../db/schema.js';
import { ClientUpload } from '../models/client-upload.js';
import { NotFoundError } from '../utils/errors.js';
import type { HumDb } from '../db/connection.js';

type Db = HumDb['db'];

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
  const now = Date.now();
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
    .execute();

  const row = (await db.select().from(clientUploads).where(eq(clientUploads.id, id)))[0];
  return new ClientUpload(row!);
}

export async function getById(db: Db, id: string): Promise<ClientUpload | undefined> {
  const row = (await db.select().from(clientUploads).where(eq(clientUploads.id, id)))[0];
  return row ? new ClientUpload(row) : undefined;
}

export async function listByPortalUserId(
  db: Db,
  portalUserId: string,
  filters?: { category?: string },
): Promise<ClientUpload[]> {
  const conditions: SQL[] = [eq(clientUploads.portalUserId, portalUserId)];
  if (filters?.category) conditions.push(eq(clientUploads.category, filters.category as any));

  const rows = await db.select().from(clientUploads).where(and(...conditions));
  return rows.map((row) => new ClientUpload(row));
}

export async function update(
  db: Db,
  id: string,
  data: { status?: 'pending' | 'used' | 'archived' },
): Promise<ClientUpload> {
  await db.update(clientUploads)
    .set({ ...data, updatedAt: Date.now() })
    .where(eq(clientUploads.id, id))
    .execute();

  const row = (await db.select().from(clientUploads).where(eq(clientUploads.id, id)))[0];
  if (!row) throw new NotFoundError('ClientUpload', id);
  return new ClientUpload(row);
}

export async function remove(db: Db, id: string): Promise<void> {
  await db.delete(clientUploads).where(eq(clientUploads.id, id)).execute();
}
