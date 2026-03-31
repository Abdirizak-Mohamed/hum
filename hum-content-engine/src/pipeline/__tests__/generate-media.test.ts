import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateMedia } from '../generate-media.js';
import type { AiClient } from 'hum-integrations';
import type { PlannedPost } from '../plan-calendar.js';
import type { StorageClient } from '../../storage/types.js';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const mockPosts: PlannedPost[] = [
  {
    date: '2026-03-23',
    contentType: 'food_hero',
    platforms: ['instagram'],
    menuItem: { name: 'Butter Chicken', description: 'Creamy curry', category: 'Mains', price: 12.99 },
    theme: 'Monday special',
    brief: 'Hero shot',
  },
  {
    date: '2026-03-25',
    contentType: 'deal_offer',
    platforms: ['facebook'],
    menuItem: null,
    theme: 'Midweek deal',
    brief: 'Deal promo',
  },
];

const mockBrandProfile = {
  brandColours: ['#FF5733'],
  brandVoiceGuide: 'Bold',
};

function createMockAi(): AiClient {
  return {
    generateCopy: vi.fn(),
    generateBrandProfile: vi.fn(),
    generateImage: vi.fn().mockResolvedValue({ imageUrls: ['https://fal.ai/img.png'] }),
  };
}

function createMockStorage(): StorageClient {
  return {
    save: vi.fn().mockResolvedValue('client-1/content-1.png'),
    getUrl: vi.fn((p: string) => `/abs/${p}`),
    delete: vi.fn(),
  };
}

describe('generateMedia', () => {
  it('generates media for each planned post', async () => {
    const ai = createMockAi();
    const storage = createMockStorage();

    const results = await generateMedia(mockPosts, mockBrandProfile, 'client-1', {
      ai,
      storage,
      concurrency: 3,
    });

    expect(results).toHaveLength(2);
    expect(ai.generateImage).toHaveBeenCalledTimes(2);
    expect(storage.save).toHaveBeenCalledTimes(2);
  });

  it('returns GeneratedMedia with localPath', async () => {
    const ai = createMockAi();
    const storage = createMockStorage();

    const results = await generateMedia(mockPosts, mockBrandProfile, 'client-1', {
      ai,
      storage,
      concurrency: 3,
    });

    expect(results[0]).toHaveProperty('localPath');
    expect(results[0]).toHaveProperty('plannedPost');
    expect(results[0]).toHaveProperty('mimeType');
  });

  it('skips posts where image generation fails', async () => {
    const ai: AiClient = {
      generateCopy: vi.fn(),
      generateBrandProfile: vi.fn(),
      generateImage: vi.fn()
        .mockResolvedValueOnce({ imageUrls: ['https://fal.ai/img1.png'] })
        .mockRejectedValueOnce(new Error('fal.ai error')),
    };
    const storage = createMockStorage();

    const results = await generateMedia(mockPosts, mockBrandProfile, 'client-1', {
      ai,
      storage,
      concurrency: 3,
    });

    expect(results).toHaveLength(1);
    expect(results[0].plannedPost.contentType).toBe('food_hero');
  });
});
