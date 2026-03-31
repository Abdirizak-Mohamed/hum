import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { composePosts } from '../compose-posts.js';
import type { PlannedPost } from '../plan-calendar.js';
import type { GeneratedMedia } from '../generate-media.js';
import type { GeneratedCopy } from '../generate-copy.js';
import { createDb, type HumDb, clientRepo, contentItemRepo } from 'hum-core';

let humDb: HumDb;
let clientId: string;

beforeEach(async () => {
  humDb = await createDb();
  const client = await clientRepo.create(humDb.db, {
    businessName: "Ali's Kitchen",
    email: 'ali@test.com',
  });
  clientId = client.id;
});

afterEach(async () => {
  await humDb?.close();
});

const post1: PlannedPost = {
  date: '2026-03-23',
  contentType: 'food_hero',
  platforms: ['instagram', 'facebook'],
  menuItem: { name: 'Butter Chicken', description: 'Creamy curry', category: 'Mains', price: 12.99 },
  theme: 'Monday special',
  brief: 'Hero shot',
};

describe('composePosts', () => {
  it('creates ComposedPosts from matching media and copy', async () => {
    const media: GeneratedMedia[] = [
      { plannedPost: post1, localPath: 'client-1/img.png', mimeType: 'image/png' },
    ];
    const copy: GeneratedCopy[] = [
      { plannedPost: post1, platform: 'instagram', caption: 'Yum!', hashtags: ['#food'], cta: 'Order now' },
      { plannedPost: post1, platform: 'facebook', caption: 'Tasty!', hashtags: ['#food'], cta: 'Try it' },
    ];
    const peakPostingTimes = { instagram: ['12:00', '18:00'], facebook: ['11:00'] };

    const results = await composePosts(
      [post1], media, copy, clientId, peakPostingTimes, humDb.db,
    );

    expect(results).toHaveLength(2);
    expect(results[0].platform).toBe('instagram');
    expect(results[1].platform).toBe('facebook');
  });

  it('creates ContentItem rows in database', async () => {
    const media: GeneratedMedia[] = [
      { plannedPost: post1, localPath: 'client-1/img.png', mimeType: 'image/png' },
    ];
    const copy: GeneratedCopy[] = [
      { plannedPost: post1, platform: 'instagram', caption: 'Yum!', hashtags: ['#food'], cta: 'Order now' },
    ];

    await composePosts([post1], media, copy, clientId, {}, humDb.db);

    const items = await contentItemRepo.list(humDb.db, { clientId });
    expect(items).toHaveLength(1);
    expect(items[0].status).toBe('draft');
    expect(items[0].caption).toBe('Yum!');
  });

  it('deduplicates hashtags', async () => {
    const media: GeneratedMedia[] = [
      { plannedPost: post1, localPath: 'client-1/img.png', mimeType: 'image/png' },
    ];
    const copy: GeneratedCopy[] = [
      { plannedPost: post1, platform: 'instagram', caption: 'Yum!', hashtags: ['#food', '#food', '#yum'], cta: 'Order' },
    ];

    const results = await composePosts([post1], media, copy, clientId, {}, humDb.db);
    expect(results[0].hashtags).toEqual(['#food', '#yum']);
  });

  it('skips posts with missing media', async () => {
    const media: GeneratedMedia[] = []; // no media
    const copy: GeneratedCopy[] = [
      { plannedPost: post1, platform: 'instagram', caption: 'Yum!', hashtags: [], cta: 'Order' },
    ];

    const results = await composePosts([post1], media, copy, clientId, {}, humDb.db);
    expect(results).toHaveLength(0);
  });

  it('skips posts with missing copy for that platform', async () => {
    const media: GeneratedMedia[] = [
      { plannedPost: post1, localPath: 'client-1/img.png', mimeType: 'image/png' },
    ];
    const copy: GeneratedCopy[] = []; // no copy

    const results = await composePosts([post1], media, copy, clientId, {}, humDb.db);
    expect(results).toHaveLength(0);
  });
});
