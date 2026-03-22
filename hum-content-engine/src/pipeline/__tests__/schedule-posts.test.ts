import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { schedulePosts } from '../schedule-posts.js';
import type { SocialClient } from 'hum-integrations';
import type { ComposedPost } from '../compose-posts.js';
import type { StorageClient } from '../../storage/types.js';
import { createDb, type HumDb, clientRepo, contentItemRepo } from 'hum-core';

let humDb: HumDb;
let clientId: string;

beforeEach(async () => {
  humDb = createDb(':memory:');
  const client = await clientRepo.create(humDb.db, {
    businessName: "Ali's Kitchen",
    email: 'ali@test.com',
  });
  clientId = client.id;
});

afterEach(() => {
  humDb?.close();
});

function createMockSocial(): SocialClient {
  return {
    schedulePost: vi.fn().mockResolvedValue({
      id: 'mock-post-1',
      status: 'scheduled',
      postIds: {},
    }),
    getProfiles: vi.fn(),
    deletePost: vi.fn(),
  };
}

function createMockStorage(): StorageClient {
  return {
    save: vi.fn(),
    getUrl: vi.fn((p: string) => `/absolute/${p}`),
    delete: vi.fn(),
  };
}

describe('schedulePosts', () => {
  it('schedules posts and updates ContentItem status to scheduled', async () => {
    const item = await contentItemRepo.create(humDb.db, {
      clientId,
      contentType: 'food_hero',
      caption: 'Test',
      platforms: ['instagram'],
    });

    const composedPost: ComposedPost = {
      plannedPost: {
        date: '2026-03-23',
        contentType: 'food_hero',
        platforms: ['instagram'],
        theme: 'test',
        brief: 'test',
      },
      platform: 'instagram',
      caption: 'Test',
      hashtags: ['#food'],
      cta: 'Order now',
      mediaPath: 'client-1/img.png',
      scheduledAt: '2026-03-23T12:00:00.000Z',
      contentItemId: item.id,
    };

    const social = createMockSocial();
    const storage = createMockStorage();

    const result = await schedulePosts([composedPost], 'profile-key-1', social, storage, humDb.db);

    expect(social.schedulePost).toHaveBeenCalledTimes(1);
    expect(social.schedulePost).toHaveBeenCalledWith(
      expect.objectContaining({
        profileKey: 'profile-key-1',
        platforms: ['instagram'],
        mediaUrls: ['/absolute/client-1/img.png'],
      }),
    );

    const updated = await contentItemRepo.getById(humDb.db, item.id);
    expect(updated?.status).toBe('scheduled');
    expect(result.scheduled).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('marks posts as failed on scheduling error and continues', async () => {
    const item1 = await contentItemRepo.create(humDb.db, { clientId, contentType: 'food_hero', platforms: ['instagram'] });
    const item2 = await contentItemRepo.create(humDb.db, { clientId, contentType: 'deal_offer', platforms: ['facebook'] });

    const posts: ComposedPost[] = [
      {
        plannedPost: { date: '2026-03-23', contentType: 'food_hero', platforms: ['instagram'], theme: 't', brief: 'b' },
        platform: 'instagram', caption: 'A', hashtags: [], cta: '', mediaPath: 'a.png',
        scheduledAt: '2026-03-23T12:00:00.000Z', contentItemId: item1.id,
      },
      {
        plannedPost: { date: '2026-03-24', contentType: 'deal_offer', platforms: ['facebook'], theme: 't', brief: 'b' },
        platform: 'facebook', caption: 'B', hashtags: [], cta: '', mediaPath: 'b.png',
        scheduledAt: '2026-03-24T12:00:00.000Z', contentItemId: item2.id,
      },
    ];

    const social: SocialClient = {
      schedulePost: vi.fn()
        .mockRejectedValueOnce(new Error('API down'))
        .mockResolvedValueOnce({ id: 'mock', status: 'scheduled', postIds: {} }),
      getProfiles: vi.fn(),
      deletePost: vi.fn(),
    };
    const storage = createMockStorage();

    const result = await schedulePosts(posts, 'profile-key-1', social, storage, humDb.db);

    expect(result.scheduled).toBe(1);
    expect(result.failed).toBe(1);

    const failed = await contentItemRepo.getById(humDb.db, item1.id);
    expect(failed?.status).toBe('failed');

    const scheduled = await contentItemRepo.getById(humDb.db, item2.id);
    expect(scheduled?.status).toBe('scheduled');
  });
});
