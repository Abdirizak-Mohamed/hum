import { createDb, logger } from 'hum-core';
import { createAiClient } from 'hum-integrations';
import { createStubContentEngine } from './engine/stub.js';
import { startOnboarding, resumeOnboarding } from './index.js';
import type { IntakeData } from './session/types.js';

type OnboardingEvent = {
  action: 'start' | 'resume';
  intakeData?: IntakeData;
  sessionId?: string;
};

export async function run(event: OnboardingEvent) {
  logger.info(`Onboarding Lambda invoked: ${event.action}`);

  const humDb = await createDb(process.env.DATABASE_URL);
  const ai = createAiClient({});
  const contentEngine = createStubContentEngine();
  const integrations = { ai, contentEngine };

  try {
    if (event.action === 'start' && event.intakeData) {
      const session = await startOnboarding(humDb.db, event.intakeData, integrations);
      logger.info(`Onboarding started: session=${session.id} status=${session.status}`);
      return { statusCode: 200, body: { sessionId: session.id, status: session.status } };
    }

    if (event.action === 'resume' && event.sessionId) {
      const session = await resumeOnboarding(humDb.db, event.sessionId, integrations);
      logger.info(`Onboarding resumed: session=${session.id} status=${session.status}`);
      return { statusCode: 200, body: { sessionId: session.id, status: session.status } };
    }

    return { statusCode: 400, body: { error: 'Invalid event: provide action + intakeData or sessionId' } };
  } finally {
    await humDb.close();
  }
}
