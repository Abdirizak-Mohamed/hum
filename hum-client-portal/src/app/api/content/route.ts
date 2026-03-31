import { NextRequest, NextResponse } from 'next/server';
import { getPortalUser } from '@/lib/auth';
import { contentItemRepo } from 'hum-core';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getPortalUser();

  if (!user || !user.clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status') ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

  const allItems = await contentItemRepo.list(db, {
    clientId: user.clientId,
    status,
  });

  const total = allItems.length;
  const start = (page - 1) * limit;
  const items = allItems.slice(start, start + limit);

  // Serialize content items (convert Date objects to ISO strings)
  const serialized = items.map((item) => ({
    id: item.id,
    clientId: item.clientId,
    contentType: item.contentType,
    status: item.status,
    caption: item.caption,
    hashtags: item.hashtags,
    cta: item.cta,
    mediaUrls: item.mediaUrls,
    platforms: item.platforms,
    scheduledAt: item.scheduledAt?.toISOString() ?? null,
    postedAt: item.postedAt?.toISOString() ?? null,
    performance: item.performance,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));

  return NextResponse.json({ items: serialized, total, page, limit });
}
