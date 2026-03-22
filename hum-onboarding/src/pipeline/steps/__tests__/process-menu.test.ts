import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb, clientRepo } from 'hum-core';
import { processMenuStep } from '../process-menu.js';
import * as sessionRepo from '../../../session/repository.js';
import type { AiClient } from 'hum-integrations';

let humDb: HumDb;

beforeEach(() => {
  humDb = createDb(':memory:');
});

afterEach(() => {
  humDb?.close();
});

const mockAi: AiClient = {
  generateCopy: async () => ({
    text: JSON.stringify([
      { name: 'Chicken Kebab', description: 'Grilled chicken', category: 'Mains', price: 7.99 },
      { name: 'Chips', description: 'Crispy fries', category: 'Sides', price: 2.99 },
    ]),
    usage: { promptTokens: 100, completionTokens: 50 },
  }),
  generateBrandProfile: async () => ({} as any),
  generateImage: async () => ({ imageUrls: [] }),
};

describe('processMenuStep', () => {
  it('has the correct step name', () => {
    expect(processMenuStep.name).toBe('process_menu');
  });

  it('extracts menu items from text via LLM and returns MenuItem[]', async () => {
    const client = await clientRepo.create(humDb.db, {
      businessName: 'Test', email: 'a@b.com',
    });
    const session = await sessionRepo.create(humDb.db, {
      clientId: client.id,
      intakeData: {
        businessName: 'Test',
        email: 'a@b.com',
        menu: 'Chicken Kebab £7.99\nChips £2.99',
      },
    });

    const result = await processMenuStep.execute({
      session,
      db: humDb.db,
      integrations: { ai: mockAi, contentEngine: {} as any },
    });

    expect(result.status).toBe('complete');
    const items = result.output?.menuItems as any[];
    expect(items).toHaveLength(2);
    expect(items[0].name).toBe('Chicken Kebab');
    expect(items[0].price).toBe(7.99);
  });

  it('fails with descriptive error when LLM returns invalid JSON', async () => {
    const badAi: AiClient = {
      ...mockAi,
      generateCopy: async () => ({
        text: 'not valid json',
        usage: { promptTokens: 100, completionTokens: 50 },
      }),
    };

    const client = await clientRepo.create(humDb.db, {
      businessName: 'Test', email: 'a@b.com',
    });
    const session = await sessionRepo.create(humDb.db, {
      clientId: client.id,
      intakeData: { businessName: 'Test', email: 'a@b.com', menu: 'test' },
    });

    const result = await processMenuStep.execute({
      session,
      db: humDb.db,
      integrations: { ai: badAi, contentEngine: {} as any },
    });

    expect(result.status).toBe('failed');
    expect(result.error).toBeDefined();
  });
});
