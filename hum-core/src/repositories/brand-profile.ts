import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { HumDb } from '../db/connection.js';
import { brandProfiles } from '../db/schema.js';
import { BrandProfile } from '../models/brand-profile.js';
import { NotFoundError } from '../utils/errors.js';

type Db = HumDb['db'];

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
  const now = Date.now();
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
    .execute();

  const row = (await db.select().from(brandProfiles).where(eq(brandProfiles.id, id)))[0];
  return new BrandProfile(row!);
}

export async function getById(db: Db, id: string): Promise<BrandProfile | undefined> {
  const row = (await db.select().from(brandProfiles).where(eq(brandProfiles.id, id)))[0];
  return row ? new BrandProfile(row) : undefined;
}

export async function getByClientId(db: Db, clientId: string): Promise<BrandProfile | undefined> {
  const row = (await db.select().from(brandProfiles).where(eq(brandProfiles.clientId, clientId)))[0];
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
    .set({ ...data, updatedAt: Date.now() })
    .where(eq(brandProfiles.id, id))
    .execute();

  const row = (await db.select().from(brandProfiles).where(eq(brandProfiles.id, id)))[0];
  if (!row) throw new NotFoundError('BrandProfile', id);
  return new BrandProfile(row);
}

export async function remove(db: Db, id: string): Promise<void> {
  await db.delete(brandProfiles).where(eq(brandProfiles.id, id)).execute();
}
