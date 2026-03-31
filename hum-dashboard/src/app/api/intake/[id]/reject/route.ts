import { NextRequest, NextResponse } from 'next/server';
import { intakeSubmissionRepo, portalUserRepo } from 'hum-core';
import { getDb } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await getDb();
  const { id } = await params;

  let body: { reviewNotes?: string } = {};
  try { body = await request.json(); } catch { /* no body is fine */ }

  const submission = await intakeSubmissionRepo.getById(db, id);
  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Reject submission
  await intakeSubmissionRepo.update(db, id, {
    status: 'rejected',
    reviewedAt: Date.now(),
    reviewNotes: body.reviewNotes ?? undefined,
  });

  // Revert portal user to pending_intake so they can resubmit
  await portalUserRepo.update(db, submission.portalUserId, {
    status: 'pending_intake',
  });

  return NextResponse.json({ ok: true });
}
