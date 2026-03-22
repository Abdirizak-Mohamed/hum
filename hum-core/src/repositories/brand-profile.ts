import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { brandProfiles } from '../db/schema.js';
import { BrandProfile } from '../models/brand-profile.js';
import { NotFoundError } from '../utils/errors.js';
import type * as schema from '../db/schema.js';

type Db = BetterSQLite3Database<typeof schema>;

export async function create(
  db: Db,
  data: {
    clientId: string;
    brandVoiceGuide?: string;
    keySellingPoints?: string[];
    targetAudienceProfile?: string;
    contentThemes?: string[];
    hashtagStrategy?: string[];
    peakPostingTimes?: Record<string, string[]>;
    menuItems?: Array<{
      name: string;
      description: string;
      category: string;
      price: number;
      photoUrl?: string;
    }>;
    brandColours?: string[];
    logoUrl?: string;
  },
): Promise<BrandProfile> {
  const now = new Date();
  const id = uuidv7();

  await db.insert(brandProfiles)
    .values({
      id,
      clientId: data.clientId,
      brandVoiceGuide: data.brandVoiceGuide ?? null,
      keySellingPoints: data.keySellingPoints ?? [],
      targetAudienceProfile: data.targetAudienceProfile ?? null,
      contentThemes: data.contentThemes ?? [],
      hashtagStrategy: data.hashtagStrategy ?? [],
      peakPostingTimes: data.peakPostingTimes ?? {},
      menuItems: data.menuItems ?? [],
      brandColours: data.brandColours ?? [],
      logoUrl: data.logoUrl ?? null,
      generatedAt: now,
      updatedAt: now,
    })
    .run();

  const row = await db.select().from(brandProfiles).where(eq(brandProfiles.id, id)).get();
  return new BrandProfile(row!);
}

export async function getById(db: Db, id: string): Promise<BrandProfile | undefined> {
  const row = await db.select().from(brandProfiles).where(eq(brandProfiles.id, id)).get();
  return row ? new BrandProfile(row) : undefined;
}

export async function getByClientId(db: Db, clientId: string): Promise<BrandProfile | undefined> {
  const row = await db.select().from(brandProfiles).where(eq(brandProfiles.clientId, clientId)).get();
  return row ? new BrandProfile(row) : undefined;
}

export async function update(
  db: Db,
  id: string,
  data: Partial<{
    brandVoiceGuide: string;
    keySellingPoints: string[];
    targetAudienceProfile: string;
    contentThemes: string[];
    hashtagStrategy: string[];
    peakPostingTimes: Record<string, string[]>;
    menuItems: Array<{
      name: string;
      description: string;
      category: string;
      price: number;
      photoUrl?: string;
    }>;
    brandColours: string[];
    logoUrl: string;
  }>,
): Promise<BrandProfile> {
  await db.update(brandProfiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(brandProfiles.id, id))
    .run();

  const row = await db.select().from(brandProfiles).where(eq(brandProfiles.id, id)).get();
  if (!row) throw new NotFoundError('BrandProfile', id);
  return new BrandProfile(row);
}

export async function remove(db: Db, id: string): Promise<void> {
  await db.delete(brandProfiles).where(eq(brandProfiles.id, id)).run();
}
