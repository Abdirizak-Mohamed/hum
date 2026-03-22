import { NextRequest, NextResponse } from 'next/server';
import { dismiss } from '@/lib/dismissed-issues';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    dismiss(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[issues/[id]/dismiss] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
