import { NextResponse } from 'next/server';
import { clientRepo, socialAccountRepo, contentItemRepo } from 'hum-core';
import { getDb } from '@/lib/db';
import type { FleetStats, ContentSummary, IssueItem } from '@/types';

export async function GET() {
  try {
    const db = await getDb();
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch all clients
    const allClients = await clientRepo.list(db);

    // Count by status
    const activeClients = allClients.filter((c) => c.status === 'active');
    const onboardingClients = allClients.filter((c) => c.status === 'onboarding');
    const pausedClients = allClients.filter((c) => c.status === 'paused');

    // Build client name map
    const clientNameMap = new Map(allClients.map((c) => [c.id, c.businessName]));

    // Fetch all social accounts (per client — no global list method)
    const allSocialAccounts = (
      await Promise.all(
        allClients.map((c) => socialAccountRepo.listByClientId(db, c.id)),
      )
    ).flat();

    // Failed content items
    const failedContent = await contentItemRepo.list(db, { status: 'failed' });

    // Gen errors: no media; post failures: has media
    const genErrors = failedContent.filter((item) => item.mediaUrls.length === 0);
    const postFailures = failedContent.filter((item) => item.mediaUrls.length > 0);

    // Posts this week (scheduled or posted, scheduledAt within last 7 days)
    const allScheduled = await contentItemRepo.list(db, { status: 'scheduled' });
    const postsThisWeek = allScheduled.filter(
      (item) => item.scheduledAt && item.scheduledAt >= oneWeekAgo,
    );

    // Social connections stats
    const connectedSocials = allSocialAccounts.filter((a) => a.status === 'connected');
    const totalSocials = allSocialAccounts.length;
    const expiredSocials = allSocialAccounts.filter((a) => a.status === 'expired');

    // ─── Health indicators ─────────────────────────────────────────────────────

    // contentPipeline: posts scheduled this week
    let contentPipelineStatus: 'green' | 'amber' | 'red';
    if (postsThisWeek.length >= 10) contentPipelineStatus = 'green';
    else if (postsThisWeek.length >= 3) contentPipelineStatus = 'amber';
    else contentPipelineStatus = 'red';

    // socialConnections: ratio connected/total
    const connectedRatio = totalSocials > 0 ? connectedSocials.length / totalSocials : 1;
    let socialConnectionsStatus: 'green' | 'amber' | 'red';
    if (connectedRatio >= 0.9) socialConnectionsStatus = 'green';
    else if (connectedRatio >= 0.6) socialConnectionsStatus = 'amber';
    else socialConnectionsStatus = 'red';

    // tokenStatus: expired count
    let tokenStatus: 'green' | 'amber' | 'red';
    if (expiredSocials.length === 0) tokenStatus = 'green';
    else if (expiredSocials.length <= 2) tokenStatus = 'amber';
    else tokenStatus = 'red';

    // contentGeneration: gen error count
    let contentGenerationStatus: 'green' | 'amber' | 'red';
    if (genErrors.length === 0) contentGenerationStatus = 'green';
    else if (genErrors.length <= 2) contentGenerationStatus = 'amber';
    else contentGenerationStatus = 'red';

    // ─── Upcoming content: next 4 scheduled items ──────────────────────────────
    const upcoming: ContentSummary[] = allScheduled
      .filter((item) => item.scheduledAt && item.scheduledAt > now)
      .sort((a, b) => a.scheduledAt!.getTime() - b.scheduledAt!.getTime())
      .slice(0, 4)
      .map((item) => ({
        id: item.id,
        clientId: item.clientId,
        clientName: clientNameMap.get(item.clientId) ?? 'Unknown',
        contentType: item.contentType,
        platform: item.platforms[0] ?? '',
        scheduledAt: item.scheduledAt!.toISOString(),
        mediaUrl: item.mediaUrls[0] ?? null,
      }));

    // ─── Recent issues ─────────────────────────────────────────────────────────
    const issueItems: IssueItem[] = [];

    // Expired tokens
    for (const acct of expiredSocials) {
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

    // Post failures (has media)
    for (const item of postFailures) {
      issueItems.push({
        id: `content-${item.id}`,
        type: 'failed_post',
        severity: 'amber',
        clientId: item.clientId,
        clientName: clientNameMap.get(item.clientId) ?? 'Unknown',
        description: `Failed to post ${item.contentType}`,
        timestamp: item.updatedAt.toISOString(),
        entityType: 'content_item',
        entityId: item.id,
      });
    }

    // Gen errors (no media)
    for (const item of genErrors) {
      issueItems.push({
        id: `content-${item.id}`,
        type: 'gen_error',
        severity: 'purple',
        clientId: item.clientId,
        clientName: clientNameMap.get(item.clientId) ?? 'Unknown',
        description: `Content generation failed for ${item.contentType}`,
        timestamp: item.updatedAt.toISOString(),
        entityType: 'content_item',
        entityId: item.id,
      });
    }

    // Sort by timestamp desc, take last 3
    issueItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const recentIssues = issueItems.slice(0, 3);

    // Clients with issues
    const clientsWithIssues = new Set([
      ...expiredSocials.map((a) => a.clientId),
      ...failedContent.map((i) => i.clientId),
    ]);

    const stats: FleetStats = {
      total: allClients.length,
      active: activeClients.length,
      issues: clientsWithIssues.size,
      onboarding: onboardingClients.length,
      paused: pausedClients.length,
      health: {
        contentPipeline: {
          status: contentPipelineStatus,
          detail: `${postsThisWeek.length} posts scheduled this week`,
        },
        socialConnections: {
          status: socialConnectionsStatus,
          detail: `${connectedSocials.length}/${totalSocials} accounts connected`,
        },
        tokenStatus: {
          status: tokenStatus,
          detail: expiredSocials.length === 0
            ? 'All tokens valid'
            : `${expiredSocials.length} expired token${expiredSocials.length > 1 ? 's' : ''}`,
        },
        contentGeneration: {
          status: contentGenerationStatus,
          detail: genErrors.length === 0
            ? 'No generation errors'
            : `${genErrors.length} generation error${genErrors.length > 1 ? 's' : ''}`,
        },
      },
      upcomingContent: upcoming,
      recentIssues,
    };

    return NextResponse.json(stats);
  } catch (err) {
    console.error('[fleet/stats] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
