import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb } from '../../db/connection.js';
import * as portalUserRepo from '../portal-user.js';
import { PortalUser } from '../../models/portal-user.js';

let humDb: HumDb;

beforeEach(() => {
  humDb = createDb(':memory:');
});

afterEach(() => {
  humDb?.close();
});

describe('portalUserRepo', () => {
  describe('create', () => {
    it('creates a portal user and returns a PortalUser instance', async () => {
      const user = await portalUserRepo.create(humDb.db, {
        email: 'ali@kebabs.com',
        passwordHash: 'hashed_pw_123',
        name: 'Ali Khan',
      });
      expect(user).toBeInstanceOf(PortalUser);
      expect(user.id).toBeDefined();
      expect(user.email).toBe('ali@kebabs.com');
      expect(user.name).toBe('Ali Khan');
      expect(user.status).toBe('pending_intake');
      expect(user.clientId).toBeNull();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.lastLoginAt).toBeNull();
    });

    it('creates a portal user with optional fields', async () => {
      const user = await portalUserRepo.create(humDb.db, {
        email: 'ali@kebabs.com',
        passwordHash: 'hashed_pw_123',
        name: 'Ali Khan',
        status: 'active',
      });
      expect(user.status).toBe('active');
    });
  });

  describe('getById', () => {
    it('returns the portal user when found', async () => {
      const created = await portalUserRepo.create(humDb.db, {
        email: 'ali@kebabs.com',
        passwordHash: 'hashed_pw_123',
        name: 'Ali Khan',
      });
      const found = await portalUserRepo.getById(humDb.db, created.id);
      expect(found).toBeInstanceOf(PortalUser);
      expect(found?.id).toBe(created.id);
    });

    it('returns undefined when not found', async () => {
      const found = await portalUserRepo.getById(humDb.db, 'nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('getByEmail', () => {
    it('returns the portal user matching the email', async () => {
      await portalUserRepo.create(humDb.db, {
        email: 'ali@kebabs.com',
        passwordHash: 'hashed_pw_123',
        name: 'Ali Khan',
      });
      const found = await portalUserRepo.getByEmail(humDb.db, 'ali@kebabs.com');
      expect(found?.name).toBe('Ali Khan');
    });
  });

  describe('update', () => {
    it('updates fields and returns updated PortalUser', async () => {
      const created = await portalUserRepo.create(humDb.db, {
        email: 'ali@kebabs.com',
        passwordHash: 'hashed_pw_123',
        name: 'Ali Khan',
      });
      const updated = await portalUserRepo.update(humDb.db, created.id, {
        name: 'Ali Ahmed Khan',
        status: 'active',
      });
      expect(updated.name).toBe('Ali Ahmed Khan');
      expect(updated.status).toBe('active');
    });

    it('updates lastLoginAt', async () => {
      const created = await portalUserRepo.create(humDb.db, {
        email: 'ali@kebabs.com',
        passwordHash: 'hashed_pw_123',
        name: 'Ali Khan',
      });
      const loginTime = new Date();
      const updated = await portalUserRepo.update(humDb.db, created.id, {
        lastLoginAt: loginTime,
      });
      expect(updated.lastLoginAt).toBeInstanceOf(Date);
    });
  });

  describe('list', () => {
    it('returns all portal users', async () => {
      await portalUserRepo.create(humDb.db, { email: 'a@test.com', passwordHash: 'h1', name: 'A' });
      await portalUserRepo.create(humDb.db, { email: 'b@test.com', passwordHash: 'h2', name: 'B' });
      const all = await portalUserRepo.list(humDb.db);
      expect(all).toHaveLength(2);
    });

    it('filters by status', async () => {
      await portalUserRepo.create(humDb.db, { email: 'a@test.com', passwordHash: 'h1', name: 'A' });
      const b = await portalUserRepo.create(humDb.db, { email: 'b@test.com', passwordHash: 'h2', name: 'B' });
      await portalUserRepo.update(humDb.db, b.id, { status: 'active' });
      const active = await portalUserRepo.list(humDb.db, { status: 'active' });
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('B');
    });
  });

  describe('remove', () => {
    it('deletes the portal user', async () => {
      const created = await portalUserRepo.create(humDb.db, {
        email: 'ali@kebabs.com',
        passwordHash: 'hashed_pw_123',
        name: 'Ali Khan',
      });
      await portalUserRepo.remove(humDb.db, created.id);
      const found = await portalUserRepo.getById(humDb.db, created.id);
      expect(found).toBeUndefined();
    });
  });
});
