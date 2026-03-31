import { NextRequest, NextResponse } from 'next/server';
import { socialAccountRepo, clientRepo } from 'hum-core';
import { createSocialConnectClient } from 'hum-integrations';
import { db } from '@/lib/db';
import { getPortalUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const user = await getPortalUser();
  if (!user?.clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { platform } = await params;
  const validPlatforms = ['instagram', 'facebook', 'tiktok', 'google_business'];
  if (!validPlatforms.includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  const client = await clientRepo.getById(db, user.clientId);
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const connectClient = createSocialConnectClient();

  // Check if client already has an Ayrshare profile (one per client, reused across platforms)
  const existingAccounts = await socialAccountRepo.listByClientId(db, user.clientId);
  let profileKey = existingAccounts.find((a) => a.ayrshareProfileKey)?.ayrshareProfileKey;

  if (!profileKey) {
    const profile = await connectClient.createProfile({ title: client.businessName });
    profileKey = profile.profileKey;
  }

  const callbackUrl = `${request.nextUrl.origin}/api/connect/callback`;
  const { url } = await connectClient.getConnectUrl(profileKey, platform as any, callbackUrl);

  return NextResponse.json({ url, profileKey });
}
