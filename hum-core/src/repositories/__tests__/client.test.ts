import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb } from '../../db/connection.js';
import * as clientRepo from '../client.js';
import { Client } from '../../models/client.js';

let humDb: HumDb;

beforeEach(() => {
  humDb = createDb(':memory:');
});

afterEach(() => {
  humDb?.close();
});

describe('clientRepo', () => {
  describe('create', () => {
    it('creates a client and returns a Client instance', async () => {
      const client = await clientRepo.create(humDb.db, {
        businessName: "Ali's Kebabs",
        email: 'ali@kebabs.com',
      });
      expect(client).toBeInstanceOf(Client);
      expect(client.id).toBeDefined();
      expect(client.businessName).toBe("Ali's Kebabs");
      expect(client.status).toBe('onboarding');
      expect(client.planTier).toBe('starter');
    });
  });

  describe('getById', () => {
    it('returns the client when found', async () => {
      const created = await clientRepo.create(humDb.db, {
        businessName: "Ali's Kebabs",
        email: 'ali@kebabs.com',
      });
      const found = await clientRepo.getById(humDb.db, created.id);
      expect(found).toBeInstanceOf(Client);
      expect(found?.id).toBe(created.id);
    });

    it('returns undefined when not found', async () => {
      const found = await clientRepo.getById(humDb.db, 'nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('getByEmail', () => {
    it('returns the client matching the email', async () => {
      await clientRepo.create(humDb.db, {
        businessName: "Ali's Kebabs",
        email: 'ali@kebabs.com',
      });
      const found = await clientRepo.getByEmail(humDb.db, 'ali@kebabs.com');
      expect(found?.businessName).toBe("Ali's Kebabs");
    });
  });

  describe('update', () => {
    it('updates fields and returns updated Client', async () => {
      const created = await clientRepo.create(humDb.db, {
        businessName: "Ali's Kebabs",
        email: 'ali@kebabs.com',
      });
      const updated = await clientRepo.update(humDb.db, created.id, {
        businessName: "Ali's Premium Kebabs",
        status: 'active',
      });
      expect(updated.businessName).toBe("Ali's Premium Kebabs");
      expect(updated.status).toBe('active');
    });
  });

  describe('list', () => {
    it('returns all clients', async () => {
      await clientRepo.create(humDb.db, { businessName: 'A', email: 'a@test.com' });
      await clientRepo.create(humDb.db, { businessName: 'B', email: 'b@test.com' });
      const all = await clientRepo.list(humDb.db);
      expect(all).toHaveLength(2);
    });

    it('filters by status', async () => {
      const c = await clientRepo.create(humDb.db, { businessName: 'A', email: 'a@test.com' });
      await clientRepo.update(humDb.db, c.id, { status: 'active' });
      await clientRepo.create(humDb.db, { businessName: 'B', email: 'b@test.com' });
      const active = await clientRepo.list(humDb.db, { status: 'active' });
      expect(active).toHaveLength(1);
      expect(active[0].businessName).toBe('A');
    });
  });

  describe('remove', () => {
    it('deletes the client', async () => {
      const created = await clientRepo.create(humDb.db, {
        businessName: "Ali's Kebabs",
        email: 'ali@kebabs.com',
      });
      await clientRepo.remove(humDb.db, created.id);
      const found = await clientRepo.getById(humDb.db, created.id);
      expect(found).toBeUndefined();
    });
  });
});
