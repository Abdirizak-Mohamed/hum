import { NextRequest, NextResponse } from 'next/server';
import { contentItemRepo } from 'hum-core';
import { db } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    // Strip "content-" prefix to get entityId
    const entityId = id.startsWith('content-') ? id.slice('content-'.length) : id;

    const updated = await contentItemRepo.update(db, entityId, { status: 'draft' });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('[issues/[id]/retry] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
