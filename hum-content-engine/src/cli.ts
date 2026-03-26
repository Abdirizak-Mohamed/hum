import { createDb, clientRepo, brandProfileRepo, logger } from 'hum-core';
import { createAiClient, createSocialClient } from 'hum-integrations';
import { LocalStorageClient } from './storage/local.js';
import { defaultConfig } from './config.js';
import { runPipeline } from './pipeline/orchestrator.js';
import { startScheduler } from './scheduler.js';

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
const dryRun = hasFlag('--dry-run');

async function main() {
  if (!command || command === 'help' || command === '--help') {
    console.log(`hum-content-engine CLI

Commands:
  generate --client <id>   Run pipeline for one client
  generate --all           Run pipeline for all active clients
  start                    Start the cron scheduler

Options:
  --dry-run                Generate content but don't schedule
  --mock                   Force mock integrations`);
    process.exit(0);
  }

  const humDb = await createDb(process.env.DATABASE_URL);
  const ai = createAiClient({ mock: useMock });
  const social = createSocialClient({ mock: useMock });
  const storage = new LocalStorageClient(defaultConfig.storage.basePath);
  const config = { ...defaultConfig, dryRun };

  if (dryRun) {
    logger.info('Dry run mode — posts will be created as drafts, not scheduled');
  }

  switch (command) {
    case 'generate': {
      const clientId = getFlag('--client');
      const all = hasFlag('--all');

      if (clientId) {
        const client = await clientRepo.getById(humDb.db, clientId);
        if (!client) {
          logger.error(`Client not found: ${clientId}`);
          process.exit(1);
        }
        const brand = await brandProfileRepo.getByClientId(humDb.db, clientId);
        if (!brand) {
          logger.error(`No brand profile for client: ${clientId}`);
          process.exit(1);
        }

        const result = await runPipeline(client, brand, {
          ai, social, storage, db: humDb.db, config,
        });
        logger.info(`Pipeline complete: ${result.scheduled} scheduled, ${result.failed} failed`);

      } else if (all) {
        const clients = await clientRepo.list(humDb.db, { status: 'active' });
        for (const client of clients) {
          const brand = await brandProfileRepo.getByClientId(humDb.db, client.id);
          if (!brand) continue;

          const result = await runPipeline(client, brand, {
            ai, social, storage, db: humDb.db, config,
          });
          logger.info(`${client.businessName}: ${result.scheduled} scheduled, ${result.failed} failed`);
        }
      } else {
        logger.error('Usage: generate --client <id> | generate --all');
        process.exit(1);
      }

      await humDb.close();
      break;
    }

    case 'start': {
      startScheduler(config, { ai, social, storage, db: humDb.db });
      logger.info('Scheduler running. Press Ctrl+C to stop.');
      break;
    }

    default:
      logger.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch((err) => {
  logger.error(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
