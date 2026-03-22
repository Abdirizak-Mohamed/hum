import { NextRequest, NextResponse } from 'next/server';
import { clientRepo, socialAccountRepo, contentItemRepo } from 'hum-core';
import { db } from '@/lib/db';
import { isDismissed } from '@/lib/dismissed-issues';
import type { IssueItem } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const countOnly = searchParams.get('countOnly') === 'true';
    const typeFilter = searchParams.get('type') ?? undefined;

    const allClients = await clientRepo.list(db);
    const clientNameMap = new Map(allClients.map((c) => [c.id, c.businessName]));

    // Fetch all social accounts per client
    const allSocialAccounts = (
      await Promise.all(
        allClients.map((c) => socialAccountRepo.listByClientId(db, c.id)),
      )
    ).flat();

    // Failed content items
    const failedContent = await contentItemRepo.list(db, { status: 'failed' });

    // Count for countOnly mode (pre-dismiss filter)
    if (countOnly) {
      const brokenSocials = allSocialAccounts.filter(
        (a) => a.status === 'expired' || a.status === 'disconnected',
      );
      const count = failedContent.length + brokenSocials.length;
      return NextResponse.json({ count });
    }

    // Build issue items
    const issueItems: IssueItem[] = [];

    // Broken social accounts: expired or disconnected
    for (const acct of allSocialAccounts) {
      if (acct.status !== 'expired' && acct.status !== 'disconnected') continue;
      issueItems.push({
        id: `social-${acct.id}`,
        type: 'token_expired',
        severity: 'red',
        clientId: acct.clientId,
        clientName: clientNameMap.get(acct.clientId) ?? 'Unknown',
        description: `${acct.platform} token expired`,
        timestamp: acct.updatedAt.toISOString(),
        entityType: 'social_account',
        entityId: acct.id,
      });
    }

    // Failed content items
    for (const item of failedContent) {
      const hasMedia = item.mediaUrls.length > 0;
      issueItems.push({
        id: `content-${item.id}`,
        type: hasMedia ? 'failed_post' : 'gen_error',
        severity: hasMedia ? 'amber' : 'purple',
        clientId: item.clientId,
        clientName: clientNameMap.get(item.clientId) ?? 'Unknown',
        description: hasMedia
          ? `Failed to post ${item.contentType}`
          : `Content generation failed for ${item.contentType}`,
        timestamp: item.updatedAt.toISOString(),
        entityType: 'content_item',
        entityId: item.id,
      });
    }

    // Filter out dismissed
    let filtered = issueItems.filter((issue) => !isDismissed(issue.id));

    // Filter by type if provided
    if (typeFilter) {
      filtered = filtered.filter((issue) => issue.type === typeFilter);
    }

    // Sort by timestamp desc
    filtered.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return NextResponse.json(filtered);
  } catch (err) {
    console.error('[issues] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
