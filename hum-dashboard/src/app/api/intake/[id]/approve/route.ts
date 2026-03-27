import { NextRequest, NextResponse } from 'next/server';
import { intakeSubmissionRepo, portalUserRepo, clientRepo, DuplicateError } from 'hum-core';
import { startOnboarding, createStubContentEngine } from 'hum-onboarding';
import { createAiClient } from 'hum-integrations';
import { db } from '@/lib/db';
import type { IntakeData } from 'hum-onboarding';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Load submission
  const submission = await intakeSubmissionRepo.getById(db, id);
  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Load portal user
  const portalUser = await portalUserRepo.getById(db, submission.portalUserId);
  if (!portalUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Parse optional body for operator-provided fields
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* no body is fine */ }

  // Map to IntakeData shape
  const intakeData: IntakeData = {
    businessName: submission.businessName,
    email: portalUser.email,
    menu: submission.menuData || 'No menu provided',
    address: submission.address ?? undefined,
    phone: submission.phone ?? undefined,
    openingHours: submission.openingHours ?? undefined,
    planTier: (body.planTier as 'starter' | 'growth' | 'premium') ?? 'starter',
    cuisineType: (body.cuisineType as string) ?? undefined,
    socialAccounts: [], // Connected later via Ayrshare OAuth
    brandPreferences: submission.brandPreferences ?? undefined,
  };

  // Construct integration clients
  const integrations = {
    ai: createAiClient(),
    contentEngine: createStubContentEngine(),
  };

  let clientId: string;

  try {
    // Run onboarding pipeline
    const session = await startOnboarding(db, intakeData, integrations);
    clientId = session.clientId;
  } catch (err) {
    if (err instanceof DuplicateError) {
      // Reject-then-reapprove case: client already exists
      const existingClient = await clientRepo.getByEmail(db, portalUser.email);
      if (!existingClient) {
        return NextResponse.json({ error: 'Duplicate error but client not found' }, { status: 500 });
      }
      clientId = existingClient.id;
    } else {
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  // Link portal user to client and activate
  await portalUserRepo.update(db, portalUser.id, {
    clientId,
    status: 'active',
  });

  // Mark submission as approved
  await intakeSubmissionRepo.update(db, id, {
    status: 'approved',
    reviewedAt: new Date(),
  });

  return NextResponse.json({ ok: true, clientId });
}
