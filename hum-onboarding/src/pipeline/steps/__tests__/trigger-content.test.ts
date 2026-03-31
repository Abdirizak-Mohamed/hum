import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb, clientRepo } from 'hum-core';
import { triggerContentStep } from '../trigger-content.js';
import * as sessionRepo from '../../../session/repository.js';
import { createStubContentEngine } from '../../../engine/stub.js';

let humDb: HumDb;

beforeEach(async () => {
  humDb = await createDb();
});

afterEach(async () => {
  await humDb?.close();
});

describe('triggerContentStep', () => {
  it('has the correct step name', () => {
    expect(triggerContentStep.name).toBe('trigger_content');
  });

  it('calls contentEngine.triggerBatch with data from prior steps', async () => {
    const client = await clientRepo.create(humDb.db, {
      businessName: 'Test', email: 'a@b.com',
    });
    const session = await sessionRepo.create(humDb.db, {
      clientId: client.id,
      intakeData: { businessName: 'Test', email: 'a@b.com', menu: 'x' },
    });

    // Simulate prior steps
    await sessionRepo.saveStepResult(humDb.db, session.id, 'create_client', {
      status: 'complete', output: { clientId: client.id },
    });
    await sessionRepo.saveStepResult(humDb.db, session.id, 'process_menu', {
      status: 'complete',
      output: { menuItems: [{ name: 'Kebab', description: 'Tasty', category: 'Mains', price: 8 }] },
    });
    await sessionRepo.saveStepResult(humDb.db, session.id, 'generate_brand', {
      status: 'complete',
      output: {
        brandProfileId: 'bp-1',
        brandVoiceGuide: 'Warm',
        keySellingPoints: ['Fresh'],
        targetAudienceProfile: 'Locals',
        contentThemes: ['food'],
        hashtagStrategy: ['#eats'],
        peakPostingTimes: { instagram: ['12:00'] },
        menuItems: [{ name: 'Kebab', description: 'Tasty', category: 'Mains', price: 8 }],
      },
    });
    await sessionRepo.saveStepResult(humDb.db, session.id, 'setup_social', {
      status: 'complete',
      output: { accounts: [{ platform: 'instagram', platformAccountId: '@test' }] },
    });

    const updatedSession = await sessionRepo.getById(humDb.db, session.id);

    const result = await triggerContentStep.execute({
      session: updatedSession!,
      db: humDb.db,
      integrations: { ai: {} as any, contentEngine: createStubContentEngine() },
    });

    expect(result.status).toBe('complete');
    expect(result.output?.contentBatchId).toBeDefined();
    expect(result.output?.status).toBe('queued');
  });
});
