import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb, clientRepo } from 'hum-core';
import * as sessionRepo from '../repository.js';
import { OnboardingSession } from '../types.js';

let humDb: HumDb;

beforeEach(() => {
  humDb = createDb(':memory:');
});

afterEach(() => {
  humDb?.close();
});

async function createTestClient() {
  return clientRepo.create(humDb.db, {
    businessName: "Ali's Kebabs",
    email: 'ali@kebabs.com',
  });
}

describe('sessionRepo', () => {
  describe('create', () => {
    it('creates a session and returns an OnboardingSession instance', async () => {
      const client = await createTestClient();
      const session = await sessionRepo.create(humDb.db, {
        clientId: client.id,
        intakeData: {
          businessName: "Ali's Kebabs",
          email: 'ali@kebabs.com',
          menu: 'Chicken Kebab £7.99',
        },
      });
      expect(session).toBeInstanceOf(OnboardingSession);
      expect(session.clientId).toBe(client.id);
      expect(session.status).toBe('in_progress');
      expect(session.intakeData).toBeDefined();
    });
  });

  describe('getById', () => {
    it('returns the session when found', async () => {
      const client = await createTestClient();
      const created = await sessionRepo.create(humDb.db, {
        clientId: client.id,
        intakeData: { businessName: 'Test', email: 'a@b.com', menu: 'x' },
      });
      const found = await sessionRepo.getById(humDb.db, created.id);
      expect(found).toBeInstanceOf(OnboardingSession);
      expect(found?.id).toBe(created.id);
    });

    it('returns undefined when not found', async () => {
      const found = await sessionRepo.getById(humDb.db, 'nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('getByClientId', () => {
    it('returns the session for the given client', async () => {
      const client = await createTestClient();
      await sessionRepo.create(humDb.db, {
        clientId: client.id,
        intakeData: { businessName: 'Test', email: 'a@b.com', menu: 'x' },
      });
      const found = await sessionRepo.getByClientId(humDb.db, client.id);
      expect(found?.clientId).toBe(client.id);
    });
  });

  describe('update', () => {
    it('updates session fields', async () => {
      const client = await createTestClient();
      const created = await sessionRepo.create(humDb.db, {
        clientId: client.id,
        intakeData: { businessName: 'Test', email: 'a@b.com', menu: 'x' },
      });
      const updated = await sessionRepo.update(humDb.db, created.id, {
        status: 'failed',
        blockedReason: 'LLM error',
      });
      expect(updated.status).toBe('failed');
      expect(updated.blockedReason).toBe('LLM error');
    });
  });

  describe('updateStepResult', () => {
    it('saves a step result into the step_results JSON', async () => {
      const client = await createTestClient();
      const session = await sessionRepo.create(humDb.db, {
        clientId: client.id,
        intakeData: { businessName: 'Test', email: 'a@b.com', menu: 'x' },
      });
      const updated = await sessionRepo.updateSessionAndStepStatus(
        humDb.db, session.id, 'create_client', 'processing',
      );
      expect(updated.currentStep).toBe('create_client');
      expect(updated.stepResults.create_client?.status).toBe('processing');
    });
  });

  describe('saveStepResult', () => {
    it('saves full step result with output', async () => {
      const client = await createTestClient();
      const session = await sessionRepo.create(humDb.db, {
        clientId: client.id,
        intakeData: { businessName: 'Test', email: 'a@b.com', menu: 'x' },
      });
      const updated = await sessionRepo.saveStepResult(
        humDb.db, session.id, 'create_client',
        { status: 'complete', output: { clientId: 'c-123' } },
      );
      expect(updated.stepResults.create_client).toEqual({
        status: 'complete',
        output: { clientId: 'c-123' },
      });
    });
  });
});
