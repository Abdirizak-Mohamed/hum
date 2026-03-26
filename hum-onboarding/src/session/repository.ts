import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { onboardingSessions, NotFoundError, type HumDb } from 'hum-core';
import { OnboardingSession } from './types.js';
import type { StepName, StepResult, IntakeData } from './types.js';

type Db = HumDb['db'];

export async function create(
  db: Db,
  data: {
    clientId: string;
    intakeData: IntakeData;
  },
): Promise<OnboardingSession> {
  const now = Date.now();
  const id = uuidv7();

  await db.insert(onboardingSessions)
    .values({
      id,
      clientId: data.clientId,
      intakeData: data.intakeData as Record<string, unknown>,
      stepResults: {},
      startedAt: now,
      updatedAt: now,
    })
    .execute();

  const rows = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, id));
  return new OnboardingSession(rows[0]!);
}

export async function getById(db: Db, id: string): Promise<OnboardingSession | undefined> {
  const rows = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, id));
  return rows[0] ? new OnboardingSession(rows[0]) : undefined;
}

export async function getByClientId(db: Db, clientId: string): Promise<OnboardingSession | undefined> {
  const rows = await db.select().from(onboardingSessions).where(eq(onboardingSessions.clientId, clientId));
  return rows[0] ? new OnboardingSession(rows[0]) : undefined;
}

export async function update(
  db: Db,
  id: string,
  data: Partial<{
    status: 'in_progress' | 'complete' | 'failed';
    currentStep: string | null;
    blockedReason: string | null;
    completedAt: number;
  }>,
): Promise<OnboardingSession> {
  await db.update(onboardingSessions)
    .set({ ...data, updatedAt: Date.now() } as any)
    .where(eq(onboardingSessions.id, id))
    .execute();

  const rows = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, id));
  if (!rows[0]) throw new NotFoundError('OnboardingSession', id);
  return new OnboardingSession(rows[0]);
}

export async function updateSessionAndStepStatus(
  db: Db,
  sessionId: string,
  stepName: StepName,
  stepStatus: 'processing' | 'pending',
): Promise<OnboardingSession> {
  const rows = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, sessionId));
  if (!rows[0]) throw new NotFoundError('OnboardingSession', sessionId);

  const stepResults = (rows[0].stepResults ?? {}) as Record<string, StepResult>;
  stepResults[stepName] = { ...stepResults[stepName], status: stepStatus };

  await db.update(onboardingSessions)
    .set({
      currentStep: stepName,
      stepResults: stepResults as Record<string, unknown>,
      updatedAt: Date.now(),
    } as any)
    .where(eq(onboardingSessions.id, sessionId))
    .execute();

  const updated = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, sessionId));
  return new OnboardingSession(updated[0]!);
}

export async function saveStepResult(
  db: Db,
  sessionId: string,
  stepName: StepName,
  result: StepResult,
): Promise<OnboardingSession> {
  const rows = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, sessionId));
  if (!rows[0]) throw new NotFoundError('OnboardingSession', sessionId);

  const stepResults = (rows[0].stepResults ?? {}) as Record<string, StepResult>;
  stepResults[stepName] = result;

  await db.update(onboardingSessions)
    .set({
      stepResults: stepResults as Record<string, unknown>,
      updatedAt: Date.now(),
    } as any)
    .where(eq(onboardingSessions.id, sessionId))
    .execute();

  const updated = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, sessionId));
  return new OnboardingSession(updated[0]!);
}
