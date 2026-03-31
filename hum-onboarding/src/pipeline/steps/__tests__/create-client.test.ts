import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb, clientRepo } from 'hum-core';
import { createClientStep } from '../create-client.js';
import * as sessionRepo from '../../../session/repository.js';

let humDb: HumDb;

beforeEach(() => {
  humDb = createDb(':memory:');
});

afterEach(() => {
  humDb?.close();
});

describe('createClientStep', () => {
  it('has the correct step name', () => {
    expect(createClientStep.name).toBe('create_client');
  });

  it('updates the existing client with full intake data and returns clientId', async () => {
    // startOnboarding creates a minimal client for the FK — this step enriches it
    const client = await clientRepo.create(humDb.db, {
      businessName: "Ali's Kebabs",
      email: 'ali@kebabs.com',
    });
    const session = await sessionRepo.create(humDb.db, {
      clientId: client.id,
      intakeData: {
        businessName: "Ali's Kebabs",
        email: 'ali@kebabs.com',
        address: '123 High Street',
        phone: '07700 900000',
        menu: 'Chicken Kebab £7.99',
        deliveryPlatforms: ['deliveroo'],
        openingHours: { monday: '11:00-23:00' },
      },
    });

    const result = await createClientStep.execute({
      session,
      db: humDb.db,
      integrations: { ai: {} as any, contentEngine: {} as any },
    });

    expect(result.status).toBe('complete');
    expect(result.output?.clientId).toBe(client.id);

    // Verify client was updated (not duplicated)
    const updated = await clientRepo.getById(humDb.db, client.id);
    expect(updated?.address).toBe('123 High Street');
    expect(updated?.phone).toBe('07700 900000');
    expect(updated?.deliveryPlatforms).toEqual(['deliveroo']);
    expect(updated?.openingHours).toEqual({ monday: '11:00-23:00' });
  });
});
