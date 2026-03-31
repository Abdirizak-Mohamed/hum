import { NextResponse } from 'next/server';
import { getPortalUser } from '@/lib/auth';
import { intakeSubmissionRepo, portalUserRepo } from 'hum-core';
import { getDb } from '@/lib/db';

export async function POST() {
  const user = await getPortalUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const submission = await intakeSubmissionRepo.getByPortalUserId(db, user.id);

  if (!submission) {
    return NextResponse.json(
      { error: 'No intake submission found. Please fill out the form first.' },
      { status: 400 },
    );
  }

  if (!submission.businessName || submission.businessName.trim() === '') {
    return NextResponse.json(
      { error: 'Business name is required' },
      { status: 400 },
    );
  }

  if (!submission.menuData || submission.menuData.trim() === '') {
    return NextResponse.json(
      { error: 'Menu information is required' },
      { status: 400 },
    );
  }

  await intakeSubmissionRepo.update(db, submission.id, {
    status: 'submitted',
    submittedAt: Date.now(),
  });

  await portalUserRepo.update(db, user.id, {
    status: 'pending_approval',
  });

  return NextResponse.json({ success: true });
}
