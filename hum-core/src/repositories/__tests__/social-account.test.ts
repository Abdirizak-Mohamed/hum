import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb } from '../../db/connection.js';
import * as clientRepo from '../client.js';
import * as socialAccountRepo from '../social-account.js';
import { SocialAccount } from '../../models/social-account.js';

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

describe('socialAccountRepo', () => {
  describe('create', () => {
    it('creates a social account', async () => {
      const account = await socialAccountRepo.create(humDb.db, {
        clientId,
        platform: 'instagram',
        platformAccountId: 'ig_12345',
      });
      expect(account).toBeInstanceOf(SocialAccount);
      expect(account.platform).toBe('instagram');
      expect(account.status).toBe('disconnected');
    });
  });

  describe('listByClientId', () => {
    it('returns all accounts for a client', async () => {
      await socialAccountRepo.create(humDb.db, {
        clientId,
        platform: 'instagram',
        platformAccountId: 'ig_12345',
      });
      await socialAccountRepo.create(humDb.db, {
        clientId,
        platform: 'facebook',
        platformAccountId: 'fb_12345',
      });
      const accounts = await socialAccountRepo.listByClientId(humDb.db, clientId);
      expect(accounts).toHaveLength(2);
    });

    it('returns empty array when client has no accounts', async () => {
      const accounts = await socialAccountRepo.listByClientId(humDb.db, 'nonexistent');
      expect(accounts).toEqual([]);
    });
  });

  describe('update', () => {
    it('updates status and sets connectedAt when connecting', async () => {
      const account = await socialAccountRepo.create(humDb.db, {
        clientId,
        platform: 'instagram',
        platformAccountId: 'ig_12345',
      });
      const updated = await socialAccountRepo.update(humDb.db, account.id, {
        status: 'connected',
        connectedAt: Date.now(),
      });
      expect(updated.status).toBe('connected');
      expect(updated.connectedAt).toBeDefined();
    });
  });

  describe('remove', () => {
    it('deletes the social account', async () => {
      const account = await socialAccountRepo.create(humDb.db, {
        clientId,
        platform: 'instagram',
        platformAccountId: 'ig_12345',
      });
      await socialAccountRepo.remove(humDb.db, account.id);
      const accounts = await socialAccountRepo.listByClientId(humDb.db, clientId);
      expect(accounts).toHaveLength(0);
    });
  });
});
