import { createDb, logger } from 'hum-core';
import { createAiClient } from 'hum-integrations';
import { createStubContentEngine } from './engine/stub.js';
import { startOnboarding, resumeOnboarding, getOnboardingStatus } from './index.js';
import type { IntakeData } from './session/types.js';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const command = args[0];

function getFlag(flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 ? args[index + 1] : undefined;
}

function hasFlag(flag: string): boolean {
  return args.includes(flag);
}

const useMock = hasFlag('--mock');

async function main() {
  if (!command || command === 'help' || command === '--help') {
    console.log(`hum-onboarding CLI

Commands:
  start --file <path.json>   Onboard a new client from intake JSON
  start --quick               Onboard with a built-in test client
  status --session <id>      Check onboarding session status
  resume --session <id>      Resume a failed/stalled session

Options:
  --mock                     Force mock integrations (default)`);
    process.exit(0);
  }

  const humDb = await createDb(process.env.DATABASE_URL);
  const ai = createAiClient({ mock: useMock || true }); // default to mock for onboarding CLI
  const contentEngine = createStubContentEngine();

  const integrations = { ai, contentEngine };

  switch (command) {
    case 'start': {
      let intakeData: IntakeData;
      const filePath = getFlag('--file');
      const quick = hasFlag('--quick');

      if (filePath) {
        const raw = readFileSync(filePath, 'utf-8');
        intakeData = JSON.parse(raw) as IntakeData;
      } else if (quick) {
        intakeData = {
          businessName: 'Test Restaurant',
          email: `test-${Date.now()}@example.com`,
          menu: 'Burger $12, Fries $5, Milkshake $6, Caesar Salad $10, Grilled Chicken $15',
          cuisineType: 'American',
          address: '123 Main St, Anytown, USA',
          planTier: 'starter',
        };
      } else {
        logger.error('Usage: start --file <path.json> | start --quick');
        process.exit(1);
      }

      logger.info(`Starting onboarding for ${intakeData.businessName}...`);
      const session = await startOnboarding(humDb.db, intakeData, integrations);
      logger.info(`Onboarding ${session.isComplete() ? 'complete' : 'in progress'}`);
      logger.info(`Session ID: ${session.id}`);
      logger.info(`Client ID:  ${session.clientId}`);
      logger.info(`Status:     ${session.status}`);
      logger.info(`Steps:      ${session.getCompletedSteps().join(', ') || 'none'}`);
      if (session.isFailed()) {
        logger.error(`Failed at:  ${session.getFailedStep()}`);
      }
      break;
    }

    case 'status': {
      const sessionId = getFlag('--session');
      if (!sessionId) {
        logger.error('Usage: status --session <id>');
        process.exit(1);
      }
      const session = await getOnboardingStatus(humDb.db, sessionId);
      logger.info(`Session ${session.id}: ${session.status}`);
      logger.info(`Steps: ${session.getCompletedSteps().join(', ') || 'none'}`);
      break;
    }

    case 'resume': {
      const sessionId = getFlag('--session');
      if (!sessionId) {
        logger.error('Usage: resume --session <id>');
        process.exit(1);
      }
      const session = await resumeOnboarding(humDb.db, sessionId, integrations);
      logger.info(`Resume result: ${session.status}`);
      break;
    }

    default:
      logger.error(`Unknown command: ${command}`);
      process.exit(1);
  }

  await humDb.close();
}

main().catch((err) => {
  logger.error(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
