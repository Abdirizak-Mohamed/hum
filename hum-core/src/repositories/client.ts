import { eq, and, type SQL } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { HumDb } from '../db/connection.js';
import { clients } from '../db/schema.js';
import { Client } from '../models/client.js';
import { NotFoundError } from '../utils/errors.js';

type Db = HumDb['db'];

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
  const now = Date.now();
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
    .execute();

  const row = (await db.select().from(clients).where(eq(clients.id, id)))[0];
  return new Client(row!);
}

export async function getById(db: Db, id: string): Promise<Client | undefined> {
  const row = (await db.select().from(clients).where(eq(clients.id, id)))[0];
  return row ? new Client(row) : undefined;
}

export async function getByEmail(db: Db, email: string): Promise<Client | undefined> {
  const row = (await db.select().from(clients).where(eq(clients.email, email)))[0];
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
    .set({ ...data, updatedAt: Date.now() })
    .where(eq(clients.id, id))
    .execute();

  const row = (await db.select().from(clients).where(eq(clients.id, id)))[0];
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
    ? await db.select().from(clients).where(and(...conditions))
    : await db.select().from(clients);

  return rows.map((row) => new Client(row));
}

export async function remove(db: Db, id: string): Promise<void> {
  await db.delete(clients).where(eq(clients.id, id)).execute();
}
