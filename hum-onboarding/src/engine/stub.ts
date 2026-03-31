import { uuidv7 } from 'uuidv7';
import { logger } from 'hum-core';
import type { ContentEngine, ContentEngineRequest, ContentEngineResponse } from './interface.js';

export function createStubContentEngine(): ContentEngine {
  return {
    async triggerBatch(request: ContentEngineRequest): Promise<ContentEngineResponse> {
      logger.info(`[stub] Content batch requested for client ${request.clientId} — engine not yet connected`);
      return { batchId: uuidv7(), status: 'queued' };
    },

    async getBatchStatus(batchId: string): Promise<ContentEngineResponse> {
      return { batchId, status: 'queued' };
    },
  };
}
