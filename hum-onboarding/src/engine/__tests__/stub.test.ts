import { describe, it, expect } from 'vitest';
import { createStubContentEngine } from '../stub.js';

describe('StubContentEngine', () => {
  const engine = createStubContentEngine();

  it('triggerBatch returns queued status with a batchId', async () => {
    const response = await engine.triggerBatch({
      clientId: 'client-1',
      brandProfile: {
        brandVoiceGuide: 'test',
        keySellingPoints: [],
        targetAudienceProfile: 'test',
        contentThemes: [],
        hashtagStrategy: [],
        peakPostingTimes: {},
        menuItems: [],
      },
      platforms: ['instagram'],
      batchSize: 30,
    });

    expect(response.status).toBe('queued');
    expect(response.batchId).toBeDefined();
    expect(typeof response.batchId).toBe('string');
  });

  it('getBatchStatus returns queued status for any batchId', async () => {
    const response = await engine.getBatchStatus('any-id');
    expect(response.status).toBe('queued');
    expect(response.batchId).toBe('any-id');
  });
});
