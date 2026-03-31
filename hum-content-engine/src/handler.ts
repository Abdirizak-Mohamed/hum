import { createDb, clientRepo, brandProfileRepo, logger } from 'hum-core';
import { createAiClient, createSocialClient } from 'hum-integrations';
import { S3StorageClient } from './storage/s3.js';
import { defaultConfig } from './config.js';
import { runPipeline } from './pipeline/orchestrator.js';

export async function run() {
  logger.info('Content engine Lambda invoked');

  const humDb = await createDb(process.env.DATABASE_URL);
  const ai = createAiClient({});
  const social = createSocialClient({});
  const storage = new S3StorageClient(process.env.MEDIA_BUCKET ?? 'hum-media');
  const config = { ...defaultConfig, dryRun: false };

  try {
    const clients = await clientRepo.list(humDb.db, { status: 'active' });
    logger.info(`Processing ${clients.length} active clients`);

    let totalScheduled = 0;
    let totalFailed = 0;

    for (const client of clients) {
      const brand = await brandProfileRepo.getByClientId(humDb.db, client.id);
      if (!brand) {
        logger.warn(`No brand profile for client ${client.id}, skipping`);
        continue;
      }

      const result = await runPipeline(client, brand, {
        ai, social, storage, db: humDb.db, config,
      });

      totalScheduled += result.scheduled;
      totalFailed += result.failed;
      logger.info(`${client.businessName}: ${result.scheduled} scheduled, ${result.failed} failed`);
    }

    logger.info(`Batch complete: ${totalScheduled} scheduled, ${totalFailed} failed across ${clients.length} clients`);
    return { statusCode: 200, body: { totalScheduled, totalFailed, clients: clients.length } };
  } finally {
    await humDb.close();
  }
}
