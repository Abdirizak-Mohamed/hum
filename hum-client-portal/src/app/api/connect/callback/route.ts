import { NextRequest, NextResponse } from 'next/server';
import { socialAccountRepo } from 'hum-core';
import { getDb } from '@/lib/db';
import { getPortalUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getPortalUser();
  if (!user?.clientId) return NextResponse.redirect(new URL('/login', request.url));

  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const profileKey = searchParams.get('profileKey');
  const platform = searchParams.get('platform');
  const status = searchParams.get('status');

  if (status === 'success' && profileKey && platform) {
    const platformAccountId = searchParams.get('accountId') || profileKey;

    // Check for existing account (reconnect case) — update instead of create
    const existing = await socialAccountRepo.listByClientId(db, user.clientId);
    const existingAccount = existing.find((a) => a.platform === platform);

    if (existingAccount) {
      await socialAccountRepo.update(db, existingAccount.id, {
        ayrshareProfileKey: profileKey,
        platformAccountId,
        status: 'connected',
      });
    } else {
      await socialAccountRepo.create(db, {
        clientId: user.clientId,
        platform: platform as any,
        platformAccountId,
        ayrshareProfileKey: profileKey,
        status: 'connected',
      });
    }
  }

  return NextResponse.redirect(new URL('/connect?result=' + (status ?? 'unknown'), request.url));
}
