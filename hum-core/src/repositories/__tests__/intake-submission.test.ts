import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb } from '../../db/connection.js';
import * as intakeSubmissionRepo from '../intake-submission.js';
import * as portalUserRepo from '../portal-user.js';
import { IntakeSubmission } from '../../models/intake-submission.js';

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

describe('intakeSubmissionRepo', () => {
  describe('create', () => {
    it('creates an intake submission with draft status by default', async () => {
      const submission = await intakeSubmissionRepo.create(humDb.db, {
        portalUserId,
        businessName: 'Ali Kebabs',
      });
      expect(submission).toBeInstanceOf(IntakeSubmission);
      expect(submission.id).toBeDefined();
      expect(submission.portalUserId).toBe(portalUserId);
      expect(submission.businessName).toBe('Ali Kebabs');
      expect(submission.status).toBe('draft');
      expect(submission.address).toBeNull();
      expect(submission.phone).toBeNull();
      expect(submission.openingHours).toBeNull();
      expect(submission.menuData).toBeNull();
      expect(submission.menuUploadIds).toEqual([]);
      expect(submission.foodPhotoUploadIds).toEqual([]);
      expect(submission.socialLinks).toBeNull();
      expect(submission.brandPreferences).toBeNull();
      expect(submission.submittedAt).toBeNull();
      expect(submission.reviewedAt).toBeNull();
      expect(submission.reviewNotes).toBeNull();
      expect(submission.createdAt).toBeInstanceOf(Date);
      expect(submission.updatedAt).toBeInstanceOf(Date);
    });

    it('creates with optional fields populated', async () => {
      const submission = await intakeSubmissionRepo.create(humDb.db, {
        portalUserId,
        businessName: 'Ali Kebabs',
        address: '123 High St',
        phone: '07700900123',
        openingHours: { mon: '9-5', tue: '9-5' },
        socialLinks: { instagram: '@alikebabs' },
      });
      expect(submission.address).toBe('123 High St');
      expect(submission.phone).toBe('07700900123');
      expect(submission.openingHours).toEqual({ mon: '9-5', tue: '9-5' });
      expect(submission.socialLinks).toEqual({ instagram: '@alikebabs' });
    });
  });

  describe('getByPortalUserId', () => {
    it('returns the submission for the portal user', async () => {
      const created = await intakeSubmissionRepo.create(humDb.db, {
        portalUserId,
        businessName: 'Ali Kebabs',
      });
      const found = await intakeSubmissionRepo.getByPortalUserId(humDb.db, portalUserId);
      expect(found).toBeInstanceOf(IntakeSubmission);
      expect(found?.id).toBe(created.id);
    });

    it('returns undefined when not found', async () => {
      const found = await intakeSubmissionRepo.getByPortalUserId(humDb.db, 'nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('update', () => {
    it('updates draft fields', async () => {
      const created = await intakeSubmissionRepo.create(humDb.db, {
        portalUserId,
        businessName: 'Ali Kebabs',
      });
      const updated = await intakeSubmissionRepo.update(humDb.db, created.id, {
        address: '456 Main Rd',
        phone: '07700900456',
        menuData: 'Chicken Kebab, Lamb Wrap',
        brandPreferences: 'Modern, vibrant',
      });
      expect(updated.address).toBe('456 Main Rd');
      expect(updated.phone).toBe('07700900456');
      expect(updated.menuData).toBe('Chicken Kebab, Lamb Wrap');
      expect(updated.brandPreferences).toBe('Modern, vibrant');
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it('updates status to submitted', async () => {
      const created = await intakeSubmissionRepo.create(humDb.db, {
        portalUserId,
        businessName: 'Ali Kebabs',
      });
      const now = new Date();
      const updated = await intakeSubmissionRepo.update(humDb.db, created.id, {
        status: 'submitted',
        submittedAt: now,
      });
      expect(updated.status).toBe('submitted');
      expect(updated.submittedAt).toBeInstanceOf(Date);
      expect(updated.isSubmitted()).toBe(true);
      expect(updated.isDraft()).toBe(false);
    });
  });

  describe('listByStatus', () => {
    it('returns submissions matching the status', async () => {
      // Create a second portal user for a second submission
      const user2 = await portalUserRepo.create(humDb.db, {
        email: 'bob@burgers.com',
        passwordHash: 'hashed_pw_456',
        name: 'Bob Burger',
      });

      const sub1 = await intakeSubmissionRepo.create(humDb.db, {
        portalUserId,
        businessName: 'Ali Kebabs',
      });
      await intakeSubmissionRepo.create(humDb.db, {
        portalUserId: user2.id,
        businessName: 'Bob Burgers',
      });

      // Submit first one
      await intakeSubmissionRepo.update(humDb.db, sub1.id, {
        status: 'submitted',
        submittedAt: new Date(),
      });

      const drafts = await intakeSubmissionRepo.listByStatus(humDb.db, 'draft');
      expect(drafts).toHaveLength(1);
      expect(drafts[0].businessName).toBe('Bob Burgers');

      const submitted = await intakeSubmissionRepo.listByStatus(humDb.db, 'submitted');
      expect(submitted).toHaveLength(1);
      expect(submitted[0].businessName).toBe('Ali Kebabs');
    });
  });

  describe('getById', () => {
    it('returns the submission when found', async () => {
      const created = await intakeSubmissionRepo.create(humDb.db, {
        portalUserId,
        businessName: 'Ali Kebabs',
      });
      const found = await intakeSubmissionRepo.getById(humDb.db, created.id);
      expect(found).toBeInstanceOf(IntakeSubmission);
      expect(found?.id).toBe(created.id);
    });

    it('returns undefined when not found', async () => {
      const found = await intakeSubmissionRepo.getById(humDb.db, 'nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('deletes the submission', async () => {
      const created = await intakeSubmissionRepo.create(humDb.db, {
        portalUserId,
        businessName: 'Ali Kebabs',
      });
      await intakeSubmissionRepo.remove(humDb.db, created.id);
      const found = await intakeSubmissionRepo.getById(humDb.db, created.id);
      expect(found).toBeUndefined();
    });
  });
});
