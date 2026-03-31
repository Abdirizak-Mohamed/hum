import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { intakeSubmissions } from '../db/schema.js';
import { IntakeSubmission } from '../models/intake-submission.js';
import { NotFoundError } from '../utils/errors.js';
import type * as schema from '../db/schema.js';

type Db = BetterSQLite3Database<typeof schema>;

export async function create(
  db: Db,
  data: {
    portalUserId: string;
    businessName: string;
    address?: string;
    phone?: string;
    openingHours?: Record<string, string>;
    menuData?: string;
    menuUploadIds?: string[];
    foodPhotoUploadIds?: string[];
    socialLinks?: Record<string, string>;
    brandPreferences?: string;
  },
): Promise<IntakeSubmission> {
  const now = new Date();
  const id = uuidv7();

  await db.insert(intakeSubmissions)
    .values({
      id,
      portalUserId: data.portalUserId,
      businessName: data.businessName,
      address: data.address ?? null,
      phone: data.phone ?? null,
      openingHours: data.openingHours ?? null,
      menuData: data.menuData ?? null,
      menuUploadIds: data.menuUploadIds ?? [],
      foodPhotoUploadIds: data.foodPhotoUploadIds ?? [],
      socialLinks: data.socialLinks ?? null,
      brandPreferences: data.brandPreferences ?? null,
      status: 'draft',
      submittedAt: null,
      reviewedAt: null,
      reviewNotes: null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const row = await db.select().from(intakeSubmissions).where(eq(intakeSubmissions.id, id)).get();
  return new IntakeSubmission(row!);
}

export async function getById(db: Db, id: string): Promise<IntakeSubmission | undefined> {
  const row = await db.select().from(intakeSubmissions).where(eq(intakeSubmissions.id, id)).get();
  return row ? new IntakeSubmission(row) : undefined;
}

export async function getByPortalUserId(db: Db, portalUserId: string): Promise<IntakeSubmission | undefined> {
  const row = await db.select().from(intakeSubmissions).where(eq(intakeSubmissions.portalUserId, portalUserId)).get();
  return row ? new IntakeSubmission(row) : undefined;
}

export async function update(
  db: Db,
  id: string,
  data: Partial<{
    businessName: string;
    address: string;
    phone: string;
    openingHours: Record<string, string>;
    menuData: string;
    menuUploadIds: string[];
    foodPhotoUploadIds: string[];
    socialLinks: Record<string, string>;
    brandPreferences: string;
    status: 'draft' | 'submitted' | 'approved' | 'rejected';
    submittedAt: Date;
    reviewedAt: Date;
    reviewNotes: string;
  }>,
): Promise<IntakeSubmission> {
  await db.update(intakeSubmissions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(intakeSubmissions.id, id))
    .run();

  const row = await db.select().from(intakeSubmissions).where(eq(intakeSubmissions.id, id)).get();
  if (!row) throw new NotFoundError('IntakeSubmission', id);
  return new IntakeSubmission(row);
}

export async function listByStatus(
  db: Db,
  status: 'draft' | 'submitted' | 'approved' | 'rejected',
): Promise<IntakeSubmission[]> {
  const rows = await db.select().from(intakeSubmissions).where(eq(intakeSubmissions.status, status)).all();
  return rows.map((row) => new IntakeSubmission(row));
}

export async function remove(db: Db, id: string): Promise<void> {
  await db.delete(intakeSubmissions).where(eq(intakeSubmissions.id, id)).run();
}
