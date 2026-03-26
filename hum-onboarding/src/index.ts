import { clientRepo, DuplicateError, NotFoundError, type HumDb } from 'hum-core';
import { runPipeline } from './pipeline/orchestrator.js';
import * as sessionRepo from './session/repository.js';
import { intakeDataSchema } from './session/types.js';
import { createClientStep } from './pipeline/steps/create-client.js';
import { processMenuStep } from './pipeline/steps/process-menu.js';
import { generateBrandStep } from './pipeline/steps/generate-brand.js';
import { setupSocialStep } from './pipeline/steps/setup-social.js';
import { triggerContentStep } from './pipeline/steps/trigger-content.js';
import type { IntegrationClients } from './pipeline/types.js';
import type { IntakeData, OnboardingSession } from './session/types.js';

type Db = HumDb['db'];

const ALL_STEPS = [
  createClientStep,
  processMenuStep,
  generateBrandStep,
  setupSocialStep,
  triggerContentStep,
];

export async function startOnboarding(
  db: Db,
  intakeData: IntakeData,
  integrations: IntegrationClients,
): Promise<OnboardingSession> {
  // Validate intake data
  const parsed = intakeDataSchema.parse(intakeData);

  // Check for existing client with same email
  const existingClient = await clientRepo.getByEmail(db, parsed.email);
  if (existingClient) {
    const existingSession = await sessionRepo.getByClientId(db, existingClient.id);
    if (existingSession) {
      throw new DuplicateError('OnboardingSession', 'email', parsed.email);
    }
  }

  // Create the client record with minimal data for the session FK.
  // Step 1 (createClientStep) enriches it with the full intake data.
  const client = await clientRepo.create(db, {
    businessName: parsed.businessName,
    email: parsed.email,
  });

  const session = await sessionRepo.create(db, {
    clientId: client.id,
    intakeData: parsed,
  });

  return runPipeline(session.id, {
    session,
    db,
    integrations,
  }, ALL_STEPS);
}

export async function resumeOnboarding(
  db: Db,
  sessionId: string,
  integrations: IntegrationClients,
): Promise<OnboardingSession> {
  const session = await sessionRepo.getById(db, sessionId);
  if (!session) throw new NotFoundError('OnboardingSession', sessionId);

  return runPipeline(sessionId, {
    session,
    db,
    integrations,
  }, ALL_STEPS);
}

export async function getOnboardingStatus(
  db: Db,
  sessionId: string,
): Promise<OnboardingSession> {
  const session = await sessionRepo.getById(db, sessionId);
  if (!session) throw new NotFoundError('OnboardingSession', sessionId);
  return session;
}

export async function getOnboardingByClientId(
  db: Db,
  clientId: string,
): Promise<OnboardingSession | undefined> {
  return sessionRepo.getByClientId(db, clientId);
}

// Re-export types for consumers
export type { ContentEngine, ContentEngineRequest, ContentEngineResponse } from './engine/interface.js';
export type { OnboardingSession, IntakeData, StepName, StepResult, StepStatus } from './session/types.js';
export type { IntegrationClients } from './pipeline/types.js';
export { createStubContentEngine } from './engine/stub.js';
