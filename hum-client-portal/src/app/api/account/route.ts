import { NextResponse } from 'next/server';
import { getPortalUser } from '@/lib/auth';
import { clientRepo, brandProfileRepo, socialAccountRepo } from 'hum-core';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await getPortalUser();

  if (!user || !user.clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const client = await clientRepo.getById(db, user.clientId);
  const brandProfile = await brandProfileRepo.getByClientId(db, user.clientId);
  const socialAccounts = await socialAccountRepo.listByClientId(db, user.clientId);

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Serialize data for JSON response
  const serializedClient = {
    id: client.id,
    businessName: client.businessName,
    email: client.email,
    planTier: client.planTier,
    status: client.status,
    phone: client.phone,
    address: client.address,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };

  const serializedBrandProfile = brandProfile ? {
    id: brandProfile.id,
    clientId: brandProfile.clientId,
    brandVoiceGuide: brandProfile.brandVoiceGuide,
    logoUrl: brandProfile.logoUrl,
  } : null;

  const serializedSocialAccounts = socialAccounts.map((account) => ({
    id: account.id,
    clientId: account.clientId,
    platform: account.platform,
    status: account.status,
    createdAt: account.createdAt.toISOString(),
    connectedAt: account.connectedAt?.toISOString() ?? null,
  }));

  return NextResponse.json({
    client: serializedClient,
    brandProfile: serializedBrandProfile,
    socialAccounts: serializedSocialAccounts,
  });
}
