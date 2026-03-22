import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb, clientRepo, socialAccountRepo } from 'hum-core';
import { setupSocialStep } from '../setup-social.js';
import * as sessionRepo from '../../../session/repository.js';

let humDb: HumDb;

beforeEach(() => {
  humDb = createDb(':memory:');
});

afterEach(() => {
  humDb?.close();
});

describe('setupSocialStep', () => {
  it('has the correct step name', () => {
    expect(setupSocialStep.name).toBe('setup_social');
  });

  it('creates social accounts for each entry in intake data', async () => {
    const client = await clientRepo.create(humDb.db, {
      businessName: 'Test', email: 'a@b.com',
    });
    const session = await sessionRepo.create(humDb.db, {
      clientId: client.id,
      intakeData: {
        businessName: 'Test',
        email: 'a@b.com',
        menu: 'x',
        socialAccounts: [
          { platform: 'instagram', platformAccountId: '@aliskebabs' },
          { platform: 'facebook', platformAccountId: 'aliskebabs' },
        ],
      },
    });

    await sessionRepo.saveStepResult(humDb.db, session.id, 'create_client', {
      status: 'complete', output: { clientId: client.id },
    });
    const updatedSession = await sessionRepo.getById(humDb.db, session.id);

    const result = await setupSocialStep.execute({
      session: updatedSession!,
      db: humDb.db,
      integrations: { ai: {} as any, contentEngine: {} as any },
    });

    expect(result.status).toBe('complete');
    const accounts = result.output?.accounts as any[];
    expect(accounts).toHaveLength(2);

    // Verify persisted
    const dbAccounts = await socialAccountRepo.listByClientId(humDb.db, client.id);
    expect(dbAccounts).toHaveLength(2);
    expect(dbAccounts[0].status).toBe('connected');
  });

  it('completes with empty accounts when none provided', async () => {
    const client = await clientRepo.create(humDb.db, {
      businessName: 'Test', email: 'a@b.com',
    });
    const session = await sessionRepo.create(humDb.db, {
      clientId: client.id,
      intakeData: { businessName: 'Test', email: 'a@b.com', menu: 'x' },
    });
    await sessionRepo.saveStepResult(humDb.db, session.id, 'create_client', {
      status: 'complete', output: { clientId: client.id },
    });
    const updatedSession = await sessionRepo.getById(humDb.db, session.id);

    const result = await setupSocialStep.execute({
      session: updatedSession!,
      db: humDb.db,
      integrations: { ai: {} as any, contentEngine: {} as any },
    });

    expect(result.status).toBe('complete');
    expect(result.output?.accounts).toEqual([]);
  });
});
