import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runPipeline } from '../orchestrator.js';
import type { AiClient, SocialClient } from 'hum-integrations';
import {
  createDb, type HumDb, clientRepo, brandProfileRepo, socialAccountRepo, contentItemRepo,
} from 'hum-core';
import { LocalStorageClient } from '../../storage/local.js';
import type { ContentEngineConfig } from '../../config.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

let humDb: HumDb;
let tmpDir: string;
let storage: LocalStorageClient;

const mockConfig: ContentEngineConfig = {
  models: { planning: 'gpt-4o', copy: 'gpt-4o-mini' },
  storage: { basePath: '' }, // set in beforeEach
  concurrency: { mediaGeneration: 2, copyGeneration: 2, clientProcessing: 1 },
};

const validCalendarJson = JSON.stringify([
  {
    date: '2026-03-23',
    contentType: 'food_hero',
    platforms: ['instagram'],
    menuItem: { name: 'Butter Chicken', description: 'Creamy curry', category: 'Mains', price: 12.99 },
    theme: 'Monday special',
    brief: 'Hero shot',
  },
]);

const validCopyJson = JSON.stringify({
  caption: 'Delicious!',
  hashtags: ['#food'],
  cta: 'Order now',
});

function createMockAi(): AiClient {
  return {
    generateCopy: vi.fn()
      .mockResolvedValueOnce({ text: validCalendarJson, usage: { promptTokens: 100, completionTokens: 50 } })
      .mockResolvedValue({ text: validCopyJson, usage: { promptTokens: 50, completionTokens: 30 } }),
    generateBrandProfile: vi.fn(),
    generateImage: vi.fn().mockResolvedValue({ imageUrls: ['https://mock.fal.ai/img.png'] }),
  };
}

function createMockSocial(): SocialClient {
  return {
    schedulePost: vi.fn().mockResolvedValue({ id: 'mock', status: 'scheduled', postIds: {} }),
    getProfiles: vi.fn(),
    deletePost: vi.fn(),
  };
}

beforeEach(async () => {
  humDb = createDb(':memory:');
  tmpDir = await mkdtemp(path.join(tmpdir(), 'hum-orchestrator-'));
  mockConfig.storage.basePath = tmpDir;
  storage = new LocalStorageClient(tmpDir);

  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  }));
});

afterEach(async () => {
  humDb?.close();
  await rm(tmpDir, { recursive: true, force: true });
  vi.unstubAllGlobals();
});

describe('runPipeline', () => {
  it('runs the full pipeline and creates scheduled ContentItems', async () => {
    const client = await clientRepo.create(humDb.db, {
      businessName: "Ali's Kitchen",
      email: 'ali@test.com',
      status: 'active',
      planTier: 'starter',
    });

    const brand = await brandProfileRepo.create(humDb.db, {
      clientId: client.id,
      brandVoiceGuide: 'Warm and friendly',
      menuItems: [{ name: 'Butter Chicken', description: 'Creamy curry', category: 'Mains', price: 12.99 }],
      keySellingPoints: ['Fresh ingredients'],
      contentThemes: ['dish spotlights'],
      hashtagStrategy: ['#LocalEats'],
      peakPostingTimes: { instagram: ['12:00'] },
    });

    await socialAccountRepo.create(humDb.db, {
      clientId: client.id,
      platform: 'instagram',
      platformAccountId: 'ig-123',
      ayrshareProfileKey: 'profile-key-1',
      status: 'connected',
    });

    const ai = createMockAi();
    const social = createMockSocial();

    const result = await runPipeline(client, brand, {
      ai,
      social,
      storage,
      db: humDb.db,
      config: mockConfig,
    });

    expect(result.clientId).toBe(client.id);
    expect(result.planned).toBeGreaterThan(0);
    expect(result.scheduled).toBeGreaterThan(0);
    expect(result.failed).toBe(0);

    const items = await contentItemRepo.list(humDb.db, { clientId: client.id });
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].status).toBe('scheduled');
  });

  it('returns failed result when calendar planning fails', async () => {
    const client = await clientRepo.create(humDb.db, {
      businessName: "Ali's Kitchen",
      email: 'ali@test.com',
      status: 'active',
      planTier: 'starter',
    });

    const brand = await brandProfileRepo.create(humDb.db, {
      clientId: client.id,
      menuItems: [],
    });

    const ai: AiClient = {
      generateCopy: vi.fn().mockResolvedValue({ text: 'not json', usage: { promptTokens: 0, completionTokens: 0 } }),
      generateBrandProfile: vi.fn(),
      generateImage: vi.fn(),
    };

    const result = await runPipeline(client, brand, {
      ai,
      social: createMockSocial(),
      storage,
      db: humDb.db,
      config: mockConfig,
    });

    expect(result.planned).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].step).toBe('plan');
  });

  it('skips scheduling when no social account has profileKey', async () => {
    const client = await clientRepo.create(humDb.db, {
      businessName: "Ali's Kitchen",
      email: 'ali@test.com',
      status: 'active',
      planTier: 'starter',
    });

    const brand = await brandProfileRepo.create(humDb.db, {
      clientId: client.id,
      brandVoiceGuide: 'Warm',
      menuItems: [{ name: 'Naan', description: 'Bread', category: 'Sides', price: 3.50 }],
      peakPostingTimes: { instagram: ['12:00'] },
    });

    // No social account created

    const ai = createMockAi();
    const social = createMockSocial();

    const result = await runPipeline(client, brand, {
      ai,
      social,
      storage,
      db: humDb.db,
      config: mockConfig,
    });

    expect(result.scheduled).toBe(0);
    expect(social.schedulePost).not.toHaveBeenCalled();
  });
});
