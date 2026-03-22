import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type HumDb, clientRepo, brandProfileRepo, socialAccountRepo } from 'hum-core';
import { startOnboarding, resumeOnboarding, getOnboardingStatus, getOnboardingByClientId } from '../index.js';
import { createStubContentEngine } from '../engine/stub.js';
import type { AiClient } from 'hum-integrations';

let humDb: HumDb;

beforeEach(() => {
  humDb = createDb(':memory:');
});

afterEach(() => {
  humDb?.close();
});

// Custom mock that returns valid JSON from generateCopy (for menu extraction)
// and valid BrandProfileResult from generateBrandProfile.
const mockAi: AiClient = {
  generateCopy: async () => ({
    text: JSON.stringify([
      { name: 'Chicken Kebab', description: 'Grilled chicken in pitta', category: 'Mains', price: 7.99 },
      { name: 'Lamb Doner', description: 'Shaved lamb with salad', category: 'Mains', price: 8.99 },
      { name: 'Chips', description: 'Crispy fries', category: 'Sides', price: 2.99 },
    ]),
    usage: { promptTokens: 100, completionTokens: 80 },
  }),
  generateBrandProfile: async () => ({
    brandVoiceGuide: 'Warm, welcoming, and proud of our heritage.',
    keySellingPoints: ['Fresh ingredients daily', 'Fast delivery'],
    targetAudienceProfile: 'Local residents aged 18-45',
    contentThemes: ['dish spotlights', 'behind-the-scenes'],
    hashtagStrategy: ['#LocalEats', '#FreshFood'],
    peakPostingTimes: { instagram: ['12:00', '18:00'], facebook: ['17:00'] },
  }),
  generateImage: async () => ({ imageUrls: [] }),
};

const integrations = {
  ai: mockAi,
  contentEngine: createStubContentEngine(),
};

describe('startOnboarding', () => {
  it('runs the full pipeline and returns a completed session', async () => {
    const session = await startOnboarding(humDb.db, {
      businessName: "Ali's Kebabs",
      email: 'ali@kebabs.com',
      address: '123 High Street, London',
      menu: 'Chicken Kebab £7.99\nLamb Doner £8.99\nChips £2.99',
      cuisineType: 'Turkish',
      socialAccounts: [
        { platform: 'instagram', platformAccountId: '@aliskebabs' },
      ],
    }, integrations);

    expect(session.isComplete()).toBe(true);
    expect(session.getCompletedSteps()).toHaveLength(5);

    // Verify side effects: client updated, brand profile + social account created
    const clientId = session.stepResults.create_client?.output?.clientId as string;
    const client = await clientRepo.getById(humDb.db, clientId);
    expect(client?.businessName).toBe("Ali's Kebabs");
    expect(client?.address).toBe('123 High Street, London');

    const profile = await brandProfileRepo.getByClientId(humDb.db, clientId);
    expect(profile).toBeDefined();
    expect(profile?.menuItems.length).toBeGreaterThan(0);

    const accounts = await socialAccountRepo.listByClientId(humDb.db, clientId);
    expect(accounts).toHaveLength(1);
    expect(accounts[0].platform).toBe('instagram');
  });

  it('throws DuplicateError when session already exists for client email', async () => {
    await startOnboarding(humDb.db, {
      businessName: "Ali's Kebabs",
      email: 'ali@kebabs.com',
      menu: 'Chicken Kebab £7.99',
    }, integrations);

    await expect(startOnboarding(humDb.db, {
      businessName: "Ali's Kebabs",
      email: 'ali@kebabs.com',
      menu: 'Chicken Kebab £7.99',
    }, integrations)).rejects.toThrow('already exists');
  });
});

describe('resumeOnboarding', () => {
  it('resumes a failed session from where it left off', async () => {
    // Use a mock that fails on first brand generation call, then succeeds
    let brandCallCount = 0;
    const failOnceAi: AiClient = {
      ...mockAi,
      generateBrandProfile: async () => {
        brandCallCount++;
        if (brandCallCount === 1) throw new Error('Temporary LLM failure');
        return mockAi.generateBrandProfile({} as any);
      },
    };

    // Start onboarding — will fail at step 3
    const failedSession = await startOnboarding(humDb.db, {
      businessName: 'Test Resume',
      email: 'resume@test.com',
      menu: 'Burger £5.99',
    }, { ai: failOnceAi, contentEngine: createStubContentEngine() });

    expect(failedSession.isFailed()).toBe(true);
    expect(failedSession.getFailedStep()).toBe('generate_brand');
    expect(failedSession.getCompletedSteps()).toEqual(['create_client', 'process_menu']);

    // Resume — brand generation will succeed this time
    const resumed = await resumeOnboarding(
      humDb.db,
      failedSession.id,
      { ai: failOnceAi, contentEngine: createStubContentEngine() },
    );

    expect(resumed.isComplete()).toBe(true);
    expect(resumed.getCompletedSteps()).toHaveLength(5);
  });
});

describe('getOnboardingStatus', () => {
  it('returns the session by id', async () => {
    const session = await startOnboarding(humDb.db, {
      businessName: 'Test', email: 'test@test.com', menu: 'x',
    }, integrations);

    const status = await getOnboardingStatus(humDb.db, session.id);
    expect(status.id).toBe(session.id);
    expect(status.isComplete()).toBe(true);
  });
});

describe('getOnboardingByClientId', () => {
  it('returns the session for the given client', async () => {
    const session = await startOnboarding(humDb.db, {
      businessName: 'Test', email: 'test@test.com', menu: 'x',
    }, integrations);

    const clientId = session.stepResults.create_client?.output?.clientId as string;
    const found = await getOnboardingByClientId(humDb.db, clientId);
    expect(found?.id).toBe(session.id);
  });
});
