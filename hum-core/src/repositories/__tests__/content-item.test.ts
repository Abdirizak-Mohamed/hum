import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb } from '../../db/connection.js';
import * as clientRepo from '../client.js';
import * as contentItemRepo from '../content-item.js';
import { ContentItem } from '../../models/content-item.js';

let humDb: HumDb;
let clientId: string;

beforeEach(async () => {
  humDb = await createDb();
  const client = await clientRepo.create(humDb.db, {
    businessName: "Ali's Kebabs",
    email: 'ali@kebabs.com',
  });
  clientId = client.id;
});

afterEach(async () => {
  await humDb?.close();
});

describe('contentItemRepo', () => {
  describe('create', () => {
    it('creates a content item', async () => {
      const item = await contentItemRepo.create(humDb.db, {
        clientId,
        contentType: 'food_hero',
      });
      expect(item).toBeInstanceOf(ContentItem);
      expect(item.contentType).toBe('food_hero');
      expect(item.status).toBe('draft');
    });
  });

  describe('list', () => {
    it('filters by clientId', async () => {
      await contentItemRepo.create(humDb.db, { clientId, contentType: 'food_hero' });
      const other = await clientRepo.create(humDb.db, { businessName: 'B', email: 'b@test.com' });
      await contentItemRepo.create(humDb.db, { clientId: other.id, contentType: 'deal_offer' });

      const items = await contentItemRepo.list(humDb.db, { clientId });
      expect(items).toHaveLength(1);
      expect(items[0].contentType).toBe('food_hero');
    });

    it('filters by status', async () => {
      const item = await contentItemRepo.create(humDb.db, { clientId, contentType: 'food_hero' });
      await contentItemRepo.update(humDb.db, item.id, { status: 'scheduled' });
      await contentItemRepo.create(humDb.db, { clientId, contentType: 'deal_offer' });

      const scheduled = await contentItemRepo.list(humDb.db, { status: 'scheduled' });
      expect(scheduled).toHaveLength(1);
    });

    it('filters by contentType', async () => {
      await contentItemRepo.create(humDb.db, { clientId, contentType: 'food_hero' });
      await contentItemRepo.create(humDb.db, { clientId, contentType: 'deal_offer' });

      const heroes = await contentItemRepo.list(humDb.db, { contentType: 'food_hero' });
      expect(heroes).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('updates fields and returns updated ContentItem', async () => {
      const item = await contentItemRepo.create(humDb.db, { clientId, contentType: 'food_hero' });
      const updated = await contentItemRepo.update(humDb.db, item.id, {
        caption: 'New caption',
        status: 'scheduled',
        scheduledAt: Date.now(),
      });
      expect(updated.caption).toBe('New caption');
      expect(updated.status).toBe('scheduled');
    });
  });

  describe('remove', () => {
    it('deletes the content item', async () => {
      const item = await contentItemRepo.create(humDb.db, { clientId, contentType: 'food_hero' });
      await contentItemRepo.remove(humDb.db, item.id);
      const found = await contentItemRepo.getById(humDb.db, item.id);
      expect(found).toBeUndefined();
    });
  });
});
