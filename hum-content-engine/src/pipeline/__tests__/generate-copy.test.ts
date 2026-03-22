import { describe, it, expect, vi } from 'vitest';
import { generateCopy } from '../generate-copy.js';
import type { AiClient } from 'hum-integrations';
import type { PlannedPost } from '../plan-calendar.js';
import type { ContentEngineConfig } from '../../config.js';

const mockConfig: ContentEngineConfig = {
  models: { planning: 'gpt-4o', copy: 'gpt-4o-mini' },
  storage: { basePath: './media' },
  concurrency: { mediaGeneration: 3, copyGeneration: 5, clientProcessing: 2 },
};

const mockPosts: PlannedPost[] = [
  {
    date: '2026-03-23',
    contentType: 'food_hero',
    platforms: ['instagram', 'facebook'],
    menuItem: { name: 'Butter Chicken', description: 'Creamy curry', category: 'Mains', price: 12.99 },
    theme: 'Monday special',
    brief: 'Hero shot',
  },
];

const mockBrandProfile = {
  brandVoiceGuide: 'Warm and friendly',
  keySellingPoints: ['Fresh ingredients'],
  hashtagStrategy: ['#LocalEats'],
};

const validCopyJson = JSON.stringify({
  caption: 'Delicious butter chicken!',
  hashtags: ['#ButterChicken', '#LocalEats'],
  cta: 'Order now!',
});

function createMockAi(): AiClient {
  return {
    generateCopy: vi.fn().mockResolvedValue({
      text: validCopyJson,
      usage: { promptTokens: 100, completionTokens: 50 },
    }),
    generateBrandProfile: vi.fn(),
    generateImage: vi.fn(),
  };
}

describe('generateCopy', () => {
  it('generates copy for each post x platform combination', async () => {
    const ai = createMockAi();
    const results = await generateCopy(mockPosts, mockBrandProfile, {
      ai,
      config: mockConfig,
      concurrency: 5,
    });

    // 1 post x 2 platforms = 2 copies
    expect(results).toHaveLength(2);
    expect(ai.generateCopy).toHaveBeenCalledTimes(2);
  });

  it('uses copy model from config', async () => {
    const ai = createMockAi();
    await generateCopy(mockPosts, mockBrandProfile, {
      ai,
      config: mockConfig,
      concurrency: 5,
    });

    expect(ai.generateCopy).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o-mini' }),
    );
  });

  it('returns GeneratedCopy with correct fields', async () => {
    const ai = createMockAi();
    const results = await generateCopy(mockPosts, mockBrandProfile, {
      ai,
      config: mockConfig,
      concurrency: 5,
    });

    expect(results[0]).toMatchObject({
      platform: 'instagram',
      caption: 'Delicious butter chicken!',
      hashtags: ['#ButterChicken', '#LocalEats'],
      cta: 'Order now!',
    });
    expect(results[1].platform).toBe('facebook');
  });

  it('skips on failure and continues', async () => {
    const ai: AiClient = {
      generateCopy: vi.fn()
        .mockResolvedValueOnce({ text: validCopyJson, usage: { promptTokens: 100, completionTokens: 50 } })
        .mockRejectedValueOnce(new Error('API error')),
      generateBrandProfile: vi.fn(),
      generateImage: vi.fn(),
    };

    const results = await generateCopy(mockPosts, mockBrandProfile, {
      ai,
      config: mockConfig,
      concurrency: 5,
    });

    expect(results).toHaveLength(1);
  });
});
