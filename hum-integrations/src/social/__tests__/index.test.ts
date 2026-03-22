import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSocialClient } from '../index.js';
import { AyrshareProvider } from '../ayrshare.js';
import { IntegrationError, IntegrationErrorCode } from '../../common/errors.js';

describe('createSocialClient', () => {
  it('returns mock client when mock=true', async () => {
    const client = createSocialClient({ mock: true });
    const result = await client.schedulePost({
      profileKey: 'test',
      post: 'test',
      platforms: ['instagram'],
    });
    expect(result.id).toEqual(expect.any(String));
    expect(result.status).toBe('scheduled');
  });
});

describe('AyrshareProvider error mapping', () => {
  let provider: AyrshareProvider;

  beforeEach(() => {
    provider = new AyrshareProvider({ apiKey: 'test-key', retryBaseDelayMs: 1 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps 401 to AUTH_EXPIRED', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Unauthorized', { status: 401 }),
    );

    await expect(provider.getProfiles()).rejects.toMatchObject({
      code: IntegrationErrorCode.AUTH_EXPIRED,
      provider: 'ayrshare',
    });
  });

  it('maps 429 to RATE_LIMITED', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Too many requests', { status: 429 }),
    );

    await expect(provider.getProfiles()).rejects.toMatchObject({
      code: IntegrationErrorCode.RATE_LIMITED,
      provider: 'ayrshare',
    });
  });

  it('maps 404 to NOT_FOUND', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not found', { status: 404 }),
    );

    await expect(provider.deletePost('bad-id')).rejects.toMatchObject({
      code: IntegrationErrorCode.NOT_FOUND,
    });
  });

  it('maps fetch TypeError to NETWORK_ERROR', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));

    await expect(provider.getProfiles()).rejects.toMatchObject({
      code: IntegrationErrorCode.NETWORK_ERROR,
    });
  });
});
