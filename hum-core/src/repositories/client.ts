import { eq, and, type SQL } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { clients } from '../db/schema.js';
import { Client } from '../models/client.js';
import { NotFoundError } from '../utils/errors.js';
import type * as schema from '../db/schema.js';

type Db = BetterSQLite3Database<typeof schema>;

export async function create(
  db: Db,
  data: {
    businessName: string;
    email: string;
    address?: string;
    phone?: string;
    latitude?: number;
    longitude?: number;
    openingHours?: Record<string, string>;
    deliveryPlatforms?: string[];
    planTier?: 'starter' | 'growth' | 'premium';
    stripeCustomerId?: string;
    status?: 'onboarding' | 'active' | 'paused' | 'churned';
  },
): Promise<Client> {
  const now = new Date();
  const id = uuidv7();

  await db.insert(clients)
    .values({
      id,
      businessName: data.businessName,
      email: data.email,
      address: data.address ?? null,
      phone: data.phone ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      openingHours: data.openingHours ?? null,
      deliveryPlatforms: data.deliveryPlatforms ?? [],
      planTier: data.planTier ?? 'starter',
      stripeCustomerId: data.stripeCustomerId ?? null,
      status: data.status ?? 'onboarding',
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const row = await db.select().from(clients).where(eq(clients.id, id)).get();
  return new Client(row!);
}

export async function getById(db: Db, id: string): Promise<Client | undefined> {
  const row = await db.select().from(clients).where(eq(clients.id, id)).get();
  return row ? new Client(row) : undefined;
}

export async function getByEmail(db: Db, email: string): Promise<Client | undefined> {
  const row = await db.select().from(clients).where(eq(clients.email, email)).get();
  return row ? new Client(row) : undefined;
}

export async function update(
  db: Db,
  id: string,
  data: Partial<{
    businessName: string;
    email: string;
    address: string;
    phone: string;
    latitude: number;
    longitude: number;
    openingHours: Record<string, string>;
    deliveryPlatforms: string[];
    planTier: 'starter' | 'growth' | 'premium';
    stripeCustomerId: string;
    status: 'onboarding' | 'active' | 'paused' | 'churned';
  }>,
): Promise<Client> {
  await db.update(clients)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(clients.id, id))
    .run();

  const row = await db.select().from(clients).where(eq(clients.id, id)).get();
  if (!row) throw new NotFoundError('Client', id);
  return new Client(row);
}

export async function list(
  db: Db,
  filters?: { status?: string; planTier?: string },
): Promise<Client[]> {
  const conditions: SQL[] = [];
  if (filters?.status) conditions.push(eq(clients.status, filters.status as any));
  if (filters?.planTier) conditions.push(eq(clients.planTier, filters.planTier as any));

  const rows = conditions.length
    ? await db.select().from(clients).where(and(...conditions)).all()
    : await db.select().from(clients).all();

  return rows.map((row) => new Client(row));
}

export async function remove(db: Db, id: string): Promise<void> {
  await db.delete(clients).where(eq(clients.id, id)).run();
}
