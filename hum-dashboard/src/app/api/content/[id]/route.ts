import { NextRequest, NextResponse } from 'next/server';
import { contentItemRepo } from 'hum-core';
import { getDb } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const db = await getDb();
    const { id } = await params;
    const body = await req.json() as { status?: string };

    if (body.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only status "draft" is allowed.' },
        { status: 400 },
      );
    }

    const updated = await contentItemRepo.update(db, id, { status: 'draft' });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('[content/[id] PATCH] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const db = await getDb();
    const { id } = await params;
    await contentItemRepo.remove(db, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[content/[id] DELETE] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
