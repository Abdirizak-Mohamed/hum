import { describe, it, expect } from 'vitest';
import { intakeDataSchema, OnboardingSession } from '../types.js';
import type { OnboardingSessionRow } from '../types.js';

describe('intakeDataSchema', () => {
  it('accepts valid intake data with required fields only', () => {
    const result = intakeDataSchema.safeParse({
      businessName: "Ali's Kebabs",
      email: 'ali@kebabs.com',
      menu: 'Chicken Kebab £7.99, Lamb Doner £8.99',
    });
    expect(result.success).toBe(true);
  });

  it('accepts full intake data with all optional fields', () => {
    const result = intakeDataSchema.safeParse({
      businessName: "Ali's Kebabs",
      email: 'ali@kebabs.com',
      address: '123 High Street',
      phone: '07700 900000',
      latitude: 51.5,
      longitude: -0.1,
      openingHours: { monday: '11:00-23:00' },
      deliveryPlatforms: ['deliveroo', 'uber_eats'],
      planTier: 'growth',
      menu: 'Chicken Kebab £7.99',
      cuisineType: 'Turkish',
      brandPreferences: 'Modern and vibrant',
      socialAccounts: [
        { platform: 'instagram', platformAccountId: '@aliskebabs' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects intake data missing required fields', () => {
    const result = intakeDataSchema.safeParse({
      businessName: "Ali's Kebabs",
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid platform in socialAccounts', () => {
    const result = intakeDataSchema.safeParse({
      businessName: "Ali's Kebabs",
      email: 'ali@kebabs.com',
      menu: 'test',
      socialAccounts: [{ platform: 'twitter', platformAccountId: '@test' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('OnboardingSession', () => {
  const baseRow: OnboardingSessionRow = {
    id: 'session-1',
    clientId: 'client-1',
    status: 'in_progress',
    currentStep: 'create_client',
    stepResults: {},
    intakeData: null,
    blockedReason: null,
    startedAt: Date.parse('2026-01-01'),
    completedAt: null,
    updatedAt: Date.parse('2026-01-01'),
  };

  it('wraps a row with readonly properties', () => {
    const session = new OnboardingSession(baseRow);
    expect(session.id).toBe('session-1');
    expect(session.status).toBe('in_progress');
  });

  it('isComplete returns true when status is complete', () => {
    const session = new OnboardingSession({ ...baseRow, status: 'complete' });
    expect(session.isComplete()).toBe(true);
  });

  it('isFailed returns true when status is failed', () => {
    const session = new OnboardingSession({ ...baseRow, status: 'failed' });
    expect(session.isFailed()).toBe(true);
  });

  it('getFailedStep returns the name of the failed step', () => {
    const session = new OnboardingSession({
      ...baseRow,
      stepResults: {
        create_client: { status: 'complete' },
        process_menu: { status: 'failed', error: 'LLM error' },
      },
    });
    expect(session.getFailedStep()).toBe('process_menu');
  });

  it('getCompletedSteps returns names of completed steps', () => {
    const session = new OnboardingSession({
      ...baseRow,
      stepResults: {
        create_client: { status: 'complete' },
        process_menu: { status: 'complete' },
        generate_brand: { status: 'processing' },
      },
    });
    expect(session.getCompletedSteps()).toEqual(['create_client', 'process_menu']);
  });

  it('getNextPendingStep returns the first non-complete step', () => {
    const allSteps = ['create_client', 'process_menu', 'generate_brand', 'setup_social', 'trigger_content'] as const;
    const session = new OnboardingSession({
      ...baseRow,
      stepResults: {
        create_client: { status: 'complete' },
        process_menu: { status: 'complete' },
      },
    });
    expect(session.getNextPendingStep([...allSteps])).toBe('generate_brand');
  });
});
