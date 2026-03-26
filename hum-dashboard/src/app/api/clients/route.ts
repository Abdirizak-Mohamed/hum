import { NextResponse } from 'next/server';
import { clientRepo, socialAccountRepo, contentItemRepo } from 'hum-core';
import { getDb } from '@/lib/db';
import type { ClientListItem } from '@/types';

export async function GET() {
  try {
    const db = await getDb();
    const clients = await clientRepo.list(db);

    const items: ClientListItem[] = await Promise.all(
      clients.map(async (client) => {
        const [socialAccounts, scheduledItems] = await Promise.all([
          socialAccountRepo.listByClientId(db, client.id),
          contentItemRepo.list(db, { clientId: client.id, status: 'scheduled' }),
        ]);

        return {
          id: client.id,
          businessName: client.businessName,
          email: client.email,
          address: client.address,
          planTier: client.planTier,
          status: client.status,
          platforms: socialAccounts.map((a) => ({
            platform: a.platform,
            status: a.status,
          })),
          scheduledCount: scheduledItems.length,
        };
      }),
    );

    return NextResponse.json(items);
  } catch (err) {
    console.error('[clients] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
