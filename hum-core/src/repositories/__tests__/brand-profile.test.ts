import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb } from '../../db/connection.js';
import * as clientRepo from '../client.js';
import * as brandProfileRepo from '../brand-profile.js';
import { BrandProfile } from '../../models/brand-profile.js';

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

describe('brandProfileRepo', () => {
  describe('create', () => {
    it('creates a brand profile and returns a BrandProfile instance', async () => {
      const profile = await brandProfileRepo.create(humDb.db, {
        clientId,
        brandVoiceGuide: 'Friendly and warm',
      });
      expect(profile).toBeInstanceOf(BrandProfile);
      expect(profile.clientId).toBe(clientId);
      expect(profile.brandVoiceGuide).toBe('Friendly and warm');
    });
  });

  describe('getByClientId', () => {
    it('returns the profile for a client', async () => {
      await brandProfileRepo.create(humDb.db, { clientId });
      const found = await brandProfileRepo.getByClientId(humDb.db, clientId);
      expect(found).toBeInstanceOf(BrandProfile);
      expect(found?.clientId).toBe(clientId);
    });

    it('returns undefined when no profile exists', async () => {
      const found = await brandProfileRepo.getByClientId(humDb.db, 'nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('update', () => {
    it('updates fields and returns updated BrandProfile', async () => {
      const profile = await brandProfileRepo.create(humDb.db, { clientId });
      const updated = await brandProfileRepo.update(humDb.db, profile.id, {
        brandVoiceGuide: 'Updated voice',
        keySellingPoints: ['Fresh', 'Fast'],
      });
      expect(updated.brandVoiceGuide).toBe('Updated voice');
      expect(updated.keySellingPoints).toEqual(['Fresh', 'Fast']);
    });
  });

  describe('remove', () => {
    it('deletes the brand profile', async () => {
      const profile = await brandProfileRepo.create(humDb.db, { clientId });
      await brandProfileRepo.remove(humDb.db, profile.id);
      const found = await brandProfileRepo.getByClientId(humDb.db, clientId);
      expect(found).toBeUndefined();
    });
  });
});
