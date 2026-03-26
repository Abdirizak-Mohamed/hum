import { eq, and, type SQL } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { HumDb } from '../db/connection.js';
import { contentItems } from '../db/schema.js';
import { ContentItem } from '../models/content-item.js';
import { NotFoundError } from '../utils/errors.js';

type Db = HumDb['db'];

export async function create(
  db: Db,
  data: {
    clientId: string;
    contentType: 'food_hero' | 'short_video' | 'deal_offer' | 'behind_scenes' | 'google_post' | 'review_highlight' | 'trending';
    caption?: string;
    hashtags?: string[];
    cta?: string;
    mediaUrls?: string[];
    platforms?: string[];
    status?: 'draft' | 'scheduled' | 'posted' | 'failed';
    scheduledAt?: number;
  },
): Promise<ContentItem> {
  const now = Date.now();
  const id = uuidv7();

  await db.insert(contentItems)
    .values({
      id,
      clientId: data.clientId,
      contentType: data.contentType,
      status: data.status ?? 'draft',
      caption: data.caption ?? null,
      hashtags: data.hashtags ?? [],
      cta: data.cta ?? null,
      mediaUrls: data.mediaUrls ?? [],
      platforms: data.platforms ?? [],
      scheduledAt: data.scheduledAt ?? null,
      postedAt: null,
      performance: null,
      createdAt: now,
      updatedAt: now,
    })
    .execute();

  const row = (await db.select().from(contentItems).where(eq(contentItems.id, id)))[0];
  return new ContentItem(row!);
}

export async function getById(db: Db, id: string): Promise<ContentItem | undefined> {
  const row = (await db.select().from(contentItems).where(eq(contentItems.id, id)))[0];
  return row ? new ContentItem(row) : undefined;
}

export async function list(
  db: Db,
  filters?: { clientId?: string; status?: string; contentType?: string },
): Promise<ContentItem[]> {
  const conditions: SQL[] = [];
  if (filters?.clientId) conditions.push(eq(contentItems.clientId, filters.clientId));
  if (filters?.status) conditions.push(eq(contentItems.status, filters.status as any));
  if (filters?.contentType) conditions.push(eq(contentItems.contentType, filters.contentType as any));

  const rows = conditions.length
    ? await db.select().from(contentItems).where(and(...conditions))
    : await db.select().from(contentItems);

  return rows.map((row) => new ContentItem(row));
}

export async function update(
  db: Db,
  id: string,
  data: Partial<{
    contentType: 'food_hero' | 'short_video' | 'deal_offer' | 'behind_scenes' | 'google_post' | 'review_highlight' | 'trending';
    status: 'draft' | 'scheduled' | 'posted' | 'failed';
    caption: string;
    hashtags: string[];
    cta: string;
    mediaUrls: string[];
    platforms: string[];
    scheduledAt: number;
    postedAt: number;
    performance: { reach: number; impressions: number; engagement: number; clicks: number };
  }>,
): Promise<ContentItem> {
  await db.update(contentItems)
    .set({ ...data, updatedAt: Date.now() })
    .where(eq(contentItems.id, id))
    .execute();

  const row = (await db.select().from(contentItems).where(eq(contentItems.id, id)))[0];
  if (!row) throw new NotFoundError('ContentItem', id);
  return new ContentItem(row);
}

export async function remove(db: Db, id: string): Promise<void> {
  await db.delete(contentItems).where(eq(contentItems.id, id)).execute();
}
