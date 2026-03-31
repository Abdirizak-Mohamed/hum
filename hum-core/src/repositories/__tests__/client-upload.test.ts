import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb } from '../../db/connection.js';
import * as clientUploadRepo from '../client-upload.js';
import * as portalUserRepo from '../portal-user.js';
import { ClientUpload } from '../../models/client-upload.js';

let humDb: HumDb;
let portalUserId: string;

beforeEach(async () => {
  humDb = createDb(':memory:');
  // Create a portal user for FK reference
  const user = await portalUserRepo.create(humDb.db, {
    email: 'ali@kebabs.com',
    passwordHash: 'hashed_pw_123',
    name: 'Ali Khan',
  });
  portalUserId = user.id;
});

afterEach(() => {
  humDb?.close();
});

describe('clientUploadRepo', () => {
  describe('create', () => {
    it('creates a client upload and returns a ClientUpload instance', async () => {
      const upload = await clientUploadRepo.create(humDb.db, {
        portalUserId,
        filename: 'kebab-hero.jpg',
        storagePath: '/uploads/kebab-hero.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 204800,
        category: 'food_photo',
      });
      expect(upload).toBeInstanceOf(ClientUpload);
      expect(upload.id).toBeDefined();
      expect(upload.portalUserId).toBe(portalUserId);
      expect(upload.filename).toBe('kebab-hero.jpg');
      expect(upload.storagePath).toBe('/uploads/kebab-hero.jpg');
      expect(upload.mimeType).toBe('image/jpeg');
      expect(upload.sizeBytes).toBe(204800);
      expect(upload.category).toBe('food_photo');
      expect(upload.status).toBe('pending');
      expect(upload.createdAt).toBeInstanceOf(Date);
      expect(upload.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('listByPortalUserId', () => {
    it('returns all uploads for a portal user', async () => {
      await clientUploadRepo.create(humDb.db, {
        portalUserId,
        filename: 'kebab-hero.jpg',
        storagePath: '/uploads/kebab-hero.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 204800,
        category: 'food_photo',
      });
      await clientUploadRepo.create(humDb.db, {
        portalUserId,
        filename: 'logo.png',
        storagePath: '/uploads/logo.png',
        mimeType: 'image/png',
        sizeBytes: 102400,
        category: 'logo',
      });
      const all = await clientUploadRepo.listByPortalUserId(humDb.db, portalUserId);
      expect(all).toHaveLength(2);
    });

    it('filters by category', async () => {
      await clientUploadRepo.create(humDb.db, {
        portalUserId,
        filename: 'kebab-hero.jpg',
        storagePath: '/uploads/kebab-hero.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 204800,
        category: 'food_photo',
      });
      await clientUploadRepo.create(humDb.db, {
        portalUserId,
        filename: 'logo.png',
        storagePath: '/uploads/logo.png',
        mimeType: 'image/png',
        sizeBytes: 102400,
        category: 'logo',
      });
      const logos = await clientUploadRepo.listByPortalUserId(humDb.db, portalUserId, { category: 'logo' });
      expect(logos).toHaveLength(1);
      expect(logos[0].filename).toBe('logo.png');
    });
  });

  describe('update', () => {
    it('updates status and returns updated ClientUpload', async () => {
      const created = await clientUploadRepo.create(humDb.db, {
        portalUserId,
        filename: 'kebab-hero.jpg',
        storagePath: '/uploads/kebab-hero.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 204800,
        category: 'food_photo',
      });
      const updated = await clientUploadRepo.update(humDb.db, created.id, { status: 'used' });
      expect(updated.status).toBe('used');
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });
  });

  describe('getById', () => {
    it('returns the upload when found', async () => {
      const created = await clientUploadRepo.create(humDb.db, {
        portalUserId,
        filename: 'kebab-hero.jpg',
        storagePath: '/uploads/kebab-hero.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 204800,
        category: 'food_photo',
      });
      const found = await clientUploadRepo.getById(humDb.db, created.id);
      expect(found).toBeInstanceOf(ClientUpload);
      expect(found?.id).toBe(created.id);
    });

    it('returns undefined when not found', async () => {
      const found = await clientUploadRepo.getById(humDb.db, 'nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('deletes the upload', async () => {
      const created = await clientUploadRepo.create(humDb.db, {
        portalUserId,
        filename: 'kebab-hero.jpg',
        storagePath: '/uploads/kebab-hero.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 204800,
        category: 'food_photo',
      });
      await clientUploadRepo.remove(humDb.db, created.id);
      const found = await clientUploadRepo.getById(humDb.db, created.id);
      expect(found).toBeUndefined();
    });
  });
});
