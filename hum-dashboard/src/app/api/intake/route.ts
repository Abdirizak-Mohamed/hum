import { NextResponse } from 'next/server';
import { intakeSubmissionRepo, portalUserRepo } from 'hum-core';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = (searchParams.get('status') ?? 'submitted') as
    | 'draft'
    | 'submitted'
    | 'approved'
    | 'rejected';

  const submissions = await intakeSubmissionRepo.listByStatus(db, status);

  // Join with portal users to get email/name
  const items = await Promise.all(
    submissions.map(async (sub) => {
      const user = await portalUserRepo.getById(db, sub.portalUserId);
      return {
        id: sub.id,
        portalUserId: sub.portalUserId,
        businessName: sub.businessName,
        address: sub.address,
        phone: sub.phone,
        menuData: sub.menuData,
        socialLinks: sub.socialLinks,
        brandPreferences: sub.brandPreferences,
        menuUploadIds: sub.menuUploadIds,
        foodPhotoUploadIds: sub.foodPhotoUploadIds,
        status: sub.status,
        submittedAt: sub.submittedAt,
        email: user?.email ?? '',
        name: user?.name ?? '',
      };
    }),
  );

  return NextResponse.json(items);
}
