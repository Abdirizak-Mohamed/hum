import cron from 'node-cron';
import PQueue from 'p-queue';
import type { AiClient, SocialClient } from 'hum-integrations';
import { clientRepo, brandProfileRepo, logger, type HumDb } from 'hum-core';
import type { StorageClient } from './storage/types.js';
import type { ContentEngineConfig } from './config.js';
import { runPipeline } from './pipeline/orchestrator.js';

type SchedulerDeps = {
  ai: AiClient;
  social: SocialClient;
  storage: StorageClient;
  db: any;
};

export function startScheduler(config: ContentEngineConfig, deps: SchedulerDeps): cron.ScheduledTask {
  const schedule = config.cron?.schedule ?? '0 2 * * 0';

  logger.info(`Starting content engine scheduler: ${schedule}`);

  return cron.schedule(schedule, async () => {
    logger.info('Weekly content generation started');
    const queue = new PQueue({ concurrency: config.concurrency.clientProcessing });

    const clients = await clientRepo.list(deps.db, { status: 'active' });
    logger.info(`Processing ${clients.length} active clients`);

    let totalScheduled = 0;
    let totalFailed = 0;

    const tasks = clients.map((client) =>
      queue.add(async () => {
        const brand = await brandProfileRepo.getByClientId(deps.db, client.id);
        if (!brand) {
          logger.warn(`No brand profile for client ${client.id}, skipping`);
          return;
        }

        const result = await runPipeline(client, brand, {
          ai: deps.ai,
          social: deps.social,
          storage: deps.storage,
          db: deps.db,
          config,
        });

        totalScheduled += result.scheduled;
        totalFailed += result.failed;
        logger.info(`Client ${client.businessName}: ${result.scheduled} scheduled, ${result.failed} failed`);
      }),
    );

    await Promise.all(tasks);
    logger.info(`Weekly batch complete: ${totalScheduled} scheduled, ${totalFailed} failed across ${clients.length} clients`);
  });
}
