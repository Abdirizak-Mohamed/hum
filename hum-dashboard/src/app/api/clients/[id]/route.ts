import { NextRequest, NextResponse } from 'next/server';
import { clientRepo, brandProfileRepo, socialAccountRepo, contentItemRepo } from 'hum-core';
import { getDb } from '@/lib/db';
import type { ClientDetail } from '@/types';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const db = await getDb();
    const { id } = await params;

    const client = await clientRepo.getById(db, id);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const [brandProfile, socialAccounts, contentItems] = await Promise.all([
      brandProfileRepo.getByClientId(db, id),
      socialAccountRepo.listByClientId(db, id),
      contentItemRepo.list(db, { clientId: id }),
    ]);

    // Sort by scheduledAt desc, take 5
    const recentContent = contentItems
      .slice()
      .sort((a, b) => {
        const aTime = a.scheduledAt?.getTime() ?? 0;
        const bTime = b.scheduledAt?.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, 5);

    const detail: ClientDetail = {
      client,
      brandProfile: brandProfile ?? null,
      socialAccounts,
      recentContent,
      onboarding: null,
    };

    return NextResponse.json(detail);
  } catch (err) {
    console.error('[clients/[id] GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const db = await getDb();
    const { id } = await params;
    const body = await req.json() as { status?: string };

    const { status } = body;
    if (status !== 'active' && status !== 'paused') {
      return NextResponse.json(
        { error: 'Invalid status. Only "active" or "paused" are allowed.' },
        { status: 400 },
      );
    }

    const updated = await clientRepo.update(db, id, { status });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('[clients/[id] PATCH] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
