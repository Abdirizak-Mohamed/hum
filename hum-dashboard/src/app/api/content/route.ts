import { NextRequest, NextResponse } from 'next/server';
import { clientRepo, contentItemRepo } from 'hum-core';
import { getDb } from '@/lib/db';

const RANGE_MAP: Record<string, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = req.nextUrl;
    const clientId = searchParams.get('clientId') ?? undefined;
    const status = searchParams.get('status') || undefined;
    const platform = searchParams.get('platform') ?? undefined;
    const range = searchParams.get('range') ?? undefined;

    // Fetch content items
    let items = await contentItemRepo.list(db, { clientId, status });

    const now = new Date();

    // Filter by platform client-side
    if (platform) {
      items = items.filter((item) => item.platforms.includes(platform));
    }

    // Filter by date range
    if (range && RANGE_MAP[range] !== undefined) {
      const rangeEnd = new Date(now.getTime() + RANGE_MAP[range]);
      items = items.filter(
        (item) =>
          item.scheduledAt !== null &&
          item.scheduledAt >= now &&
          item.scheduledAt <= rangeEnd,
      );
    }

    // Sort by scheduledAt ascending
    items.sort((a, b) => {
      const aTime = a.scheduledAt?.getTime() ?? 0;
      const bTime = b.scheduledAt?.getTime() ?? 0;
      return aTime - bTime;
    });

    // Build clientName map
    const allClients = await clientRepo.list(db);
    const clientNameMap = new Map(allClients.map((c) => [c.id, c.businessName]));

    // Serialize with clientName and ISO dates
    const result = items.map((item) => ({
      id: item.id,
      clientId: item.clientId,
      clientName: clientNameMap.get(item.clientId) ?? 'Unknown',
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

    return NextResponse.json(result);
  } catch (err) {
    console.error('[content] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
