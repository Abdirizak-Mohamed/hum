import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb, clientRepo, brandProfileRepo } from 'hum-core';
import { generateBrandStep } from '../generate-brand.js';
import * as sessionRepo from '../../../session/repository.js';
import type { AiClient } from 'hum-integrations';

let humDb: HumDb;

beforeEach(async () => {
  humDb = await createDb();
});

afterEach(async () => {
  await humDb?.close();
});

const mockAi: AiClient = {
  generateCopy: async () => ({ text: '', usage: { promptTokens: 0, completionTokens: 0 } }),
  generateBrandProfile: async () => ({
    brandVoiceGuide: 'Warm and welcoming',
    keySellingPoints: ['Fresh ingredients'],
    targetAudienceProfile: 'Local families',
    contentThemes: ['dish spotlights'],
    hashtagStrategy: ['#LocalEats'],
    peakPostingTimes: { instagram: ['12:00', '18:00'] },
  }),
  generateImage: async () => ({ imageUrls: [] }),
};

describe('generateBrandStep', () => {
  it('has the correct step name', () => {
    expect(generateBrandStep.name).toBe('generate_brand');
  });

  it('generates a brand profile and persists it', async () => {
    const client = await clientRepo.create(humDb.db, {
      businessName: "Ali's Kebabs", email: 'ali@kebabs.com',
    });
    const session = await sessionRepo.create(humDb.db, {
      clientId: client.id,
      intakeData: {
        businessName: "Ali's Kebabs",
        email: 'ali@kebabs.com',
        menu: 'Chicken Kebab £7.99',
        cuisineType: 'Turkish',
      },
    });

    // Simulate step 1 and step 2 being complete
    await sessionRepo.saveStepResult(humDb.db, session.id, 'create_client', {
      status: 'complete', output: { clientId: client.id },
    });
    await sessionRepo.saveStepResult(humDb.db, session.id, 'process_menu', {
      status: 'complete',
      output: {
        menuItems: [
          { name: 'Chicken Kebab', description: 'Grilled chicken', category: 'Mains', price: 7.99 },
        ],
      },
    });

    const updatedSession = await sessionRepo.getById(humDb.db, session.id);

    const result = await generateBrandStep.execute({
      session: updatedSession!,
      db: humDb.db,
      integrations: { ai: mockAi, contentEngine: {} as any },
    });

    expect(result.status).toBe('complete');

    // Verify brand profile was persisted
    const profile = await brandProfileRepo.getByClientId(humDb.db, client.id);
    expect(profile).toBeDefined();
    expect(profile?.brandVoiceGuide).toBe('Warm and welcoming');
    expect(profile?.menuItems).toHaveLength(1);
    expect(profile?.peakPostingTimes).toEqual({ instagram: ['12:00', '18:00'] });
  });
});
