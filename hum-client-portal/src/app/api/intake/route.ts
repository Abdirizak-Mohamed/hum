import { NextRequest, NextResponse } from 'next/server';
import { getPortalUser } from '@/lib/auth';
import { intakeSubmissionRepo, clientUploadRepo } from 'hum-core';
import { db } from '@/lib/db';

export async function GET() {
  const user = await getPortalUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const submission = await intakeSubmissionRepo.getByPortalUserId(db, user.id);

  if (!submission) {
    return NextResponse.json(null);
  }

  // Resolve upload metadata for menu and food photo IDs
  const menuUploads = [];
  for (const uploadId of submission.menuUploadIds) {
    const upload = await clientUploadRepo.getById(db, uploadId);
    if (upload) menuUploads.push(upload);
  }

  const foodPhotoUploads = [];
  for (const uploadId of submission.foodPhotoUploadIds) {
    const upload = await clientUploadRepo.getById(db, uploadId);
    if (upload) foodPhotoUploads.push(upload);
  }

  return NextResponse.json({
    ...submission,
    menuUploads,
    foodPhotoUploads,
  });
}

export async function PUT(request: NextRequest) {
  const user = await getPortalUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const fields = {
    businessName: body.businessName ?? '',
    address: body.address ?? undefined,
    phone: body.phone ?? undefined,
    openingHours: body.openingHours ?? undefined,
    menuData: body.menuData ?? undefined,
    menuUploadIds: body.menuUploadIds ?? undefined,
    foodPhotoUploadIds: body.foodPhotoUploadIds ?? undefined,
    socialLinks: body.socialLinks ?? undefined,
    brandPreferences: body.brandPreferences ?? undefined,
  };

  const existing = await intakeSubmissionRepo.getByPortalUserId(db, user.id);

  let submission;
  if (existing) {
    submission = await intakeSubmissionRepo.update(db, existing.id, {
      ...fields,
      status: 'draft',
    });
  } else {
    submission = await intakeSubmissionRepo.create(db, {
      portalUserId: user.id,
      ...fields,
    });
  }

  return NextResponse.json(submission);
}
