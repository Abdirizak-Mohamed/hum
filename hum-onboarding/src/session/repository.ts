import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { onboardingSessions, NotFoundError } from 'hum-core';
import type * as schema from 'hum-core/dist/db/schema.js';
import { OnboardingSession } from './types.js';
import type { StepName, StepResult, IntakeData } from './types.js';

type Db = BetterSQLite3Database<typeof schema>;

export async function create(
  db: Db,
  data: {
    clientId: string;
    intakeData: IntakeData;
  },
): Promise<OnboardingSession> {
  const now = new Date();
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
    .run();

  const row = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, id)).get();
  return new OnboardingSession(row!);
}

export async function getById(db: Db, id: string): Promise<OnboardingSession | undefined> {
  const row = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, id)).get();
  return row ? new OnboardingSession(row) : undefined;
}

export async function getByClientId(db: Db, clientId: string): Promise<OnboardingSession | undefined> {
  const row = await db.select().from(onboardingSessions).where(eq(onboardingSessions.clientId, clientId)).get();
  return row ? new OnboardingSession(row) : undefined;
}

export async function update(
  db: Db,
  id: string,
  data: Partial<{
    status: 'in_progress' | 'complete' | 'failed';
    currentStep: string | null;
    blockedReason: string | null;
    completedAt: Date;
  }>,
): Promise<OnboardingSession> {
  await db.update(onboardingSessions)
    .set({ ...data, updatedAt: new Date() } as any)
    .where(eq(onboardingSessions.id, id))
    .run();

  const row = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, id)).get();
  if (!row) throw new NotFoundError('OnboardingSession', id);
  return new OnboardingSession(row);
}

export async function updateSessionAndStepStatus(
  db: Db,
  sessionId: string,
  stepName: StepName,
  stepStatus: 'processing' | 'pending',
): Promise<OnboardingSession> {
  const row = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, sessionId)).get();
  if (!row) throw new NotFoundError('OnboardingSession', sessionId);

  const stepResults = (row.stepResults ?? {}) as Record<string, StepResult>;
  stepResults[stepName] = { ...stepResults[stepName], status: stepStatus };

  await db.update(onboardingSessions)
    .set({
      currentStep: stepName,
      stepResults: stepResults as Record<string, unknown>,
      updatedAt: new Date(),
    } as any)
    .where(eq(onboardingSessions.id, sessionId))
    .run();

  const updated = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, sessionId)).get();
  return new OnboardingSession(updated!);
}

export async function saveStepResult(
  db: Db,
  sessionId: string,
  stepName: StepName,
  result: StepResult,
): Promise<OnboardingSession> {
  const row = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, sessionId)).get();
  if (!row) throw new NotFoundError('OnboardingSession', sessionId);

  const stepResults = (row.stepResults ?? {}) as Record<string, StepResult>;
  stepResults[stepName] = result;

  await db.update(onboardingSessions)
    .set({
      stepResults: stepResults as Record<string, unknown>,
      updatedAt: new Date(),
    } as any)
    .where(eq(onboardingSessions.id, sessionId))
    .run();

  const updated = await db.select().from(onboardingSessions).where(eq(onboardingSessions.id, sessionId)).get();
  return new OnboardingSession(updated!);
}
