import { describe, it, expect, vi } from 'vitest';
import { planCalendar } from '../plan-calendar.js';
import type { AiClient } from 'hum-integrations';
import type { ContentEngineConfig } from '../../config.js';

const mockConfig: ContentEngineConfig = {
  models: { planning: 'gpt-4o', copy: 'gpt-4o-mini' },
  storage: { basePath: './media' },
  concurrency: { mediaGeneration: 3, copyGeneration: 5, clientProcessing: 2 },
};

const mockClient = {
  id: 'client-1',
  businessName: "Ali's Kitchen",
  address: 'London, UK',
  planTier: 'starter' as const,
};

const mockBrandProfile = {
  brandVoiceGuide: 'Warm and friendly',
  menuItems: [
    { name: 'Butter Chicken', description: 'Creamy curry', category: 'Mains', price: 12.99 },
    { name: 'Naan', description: 'Freshly baked', category: 'Sides', price: 3.50 },
  ],
  contentThemes: ['dish spotlights'],
  keySellingPoints: ['Fresh ingredients'],
  hashtagStrategy: ['#LocalEats'],
};

const validCalendarJson = JSON.stringify([
  {
    date: '2026-03-23',
    contentType: 'food_hero',
    platforms: ['instagram', 'facebook'],
    menuItem: { name: 'Butter Chicken', description: 'Creamy curry', category: 'Mains', price: 12.99 },
    theme: 'Monday special',
    brief: 'Hero shot of butter chicken',
  },
  {
    date: '2026-03-25',
    contentType: 'deal_offer',
    platforms: ['instagram'],
    menuItem: null,
    theme: '2-for-1 Wednesday',
    brief: 'Midweek deal promo',
  },
  {
    date: '2026-03-27',
    contentType: 'google_post',
    platforms: ['google_business'],
    menuItem: null,
    theme: 'Weekend update',
    brief: 'Google post for the weekend',
  },
]);

function createMockAi(response: string): AiClient {
  return {
    generateCopy: vi.fn().mockResolvedValue({ text: response, usage: { promptTokens: 100, completionTokens: 50 } }),
    generateBrandProfile: vi.fn(),
    generateImage: vi.fn(),
  };
}

describe('planCalendar', () => {
  it('returns a valid ContentCalendar from LLM response', async () => {
    const ai = createMockAi(validCalendarJson);
    const result = await planCalendar(mockClient, mockBrandProfile, {
      ai,
      config: mockConfig,
      platforms: ['instagram', 'facebook', 'google_business'],
      postsPerWeek: 3,
      recentMenuItemNames: [],
    });

    expect(result.clientId).toBe('client-1');
    expect(result.posts).toHaveLength(3);
    expect(result.posts[0].contentType).toBe('food_hero');
  });

  it('passes planning model to ai.generateCopy', async () => {
    const ai = createMockAi(validCalendarJson);
    await planCalendar(mockClient, mockBrandProfile, {
      ai,
      config: mockConfig,
      platforms: ['instagram', 'facebook'],
      postsPerWeek: 3,
      recentMenuItemNames: [],
    });

    expect(ai.generateCopy).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o' }),
    );
  });

  it('filters out platforms not in the allowed list', async () => {
    const jsonWithTiktok = JSON.stringify([
      {
        date: '2026-03-23',
        contentType: 'food_hero',
        platforms: ['instagram', 'tiktok'],
        menuItem: null,
        theme: 'test',
        brief: 'test',
      },
    ]);
    const ai = createMockAi(jsonWithTiktok);
    const result = await planCalendar(mockClient, mockBrandProfile, {
      ai,
      config: mockConfig,
      platforms: ['instagram', 'facebook'],
      postsPerWeek: 3,
      recentMenuItemNames: [],
    });

    expect(result.posts[0].platforms).toEqual(['instagram']);
  });

  it('retries once on invalid JSON, then succeeds', async () => {
    const ai: AiClient = {
      generateCopy: vi.fn()
        .mockResolvedValueOnce({ text: 'not valid json!', usage: { promptTokens: 100, completionTokens: 50 } })
        .mockResolvedValueOnce({ text: validCalendarJson, usage: { promptTokens: 100, completionTokens: 50 } }),
      generateBrandProfile: vi.fn(),
      generateImage: vi.fn(),
    };

    const result = await planCalendar(mockClient, mockBrandProfile, {
      ai,
      config: mockConfig,
      platforms: ['instagram', 'facebook', 'google_business'],
      postsPerWeek: 3,
      recentMenuItemNames: [],
    });

    expect(ai.generateCopy).toHaveBeenCalledTimes(2);
    expect(result.posts).toHaveLength(3);
  });

  it('throws after two consecutive failures', async () => {
    const ai: AiClient = {
      generateCopy: vi.fn().mockResolvedValue({ text: 'bad json', usage: { promptTokens: 100, completionTokens: 50 } }),
      generateBrandProfile: vi.fn(),
      generateImage: vi.fn(),
    };

    await expect(
      planCalendar(mockClient, mockBrandProfile, {
        ai,
        config: mockConfig,
        platforms: ['instagram', 'facebook'],
        postsPerWeek: 3,
        recentMenuItemNames: [],
      }),
    ).rejects.toThrow();
  });

  it('drops posts with empty platforms after filtering', async () => {
    const jsonOnlyTiktok = JSON.stringify([
      {
        date: '2026-03-23',
        contentType: 'food_hero',
        platforms: ['tiktok'],
        menuItem: null,
        theme: 'test',
        brief: 'test',
      },
    ]);
    const ai = createMockAi(jsonOnlyTiktok);
    const result = await planCalendar(mockClient, mockBrandProfile, {
      ai,
      config: mockConfig,
      platforms: ['instagram', 'facebook'],
      postsPerWeek: 3,
      recentMenuItemNames: [],
    });

    expect(result.posts).toHaveLength(0);
  });
});
