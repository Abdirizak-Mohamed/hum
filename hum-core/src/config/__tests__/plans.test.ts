import { describe, it, expect } from 'vitest';
import { plans, type PlanTier } from '../plans.js';

describe('plans config', () => {
  it('defines all three tiers', () => {
    expect(Object.keys(plans)).toEqual(['starter', 'growth', 'premium']);
  });
  it('starter has fewest posts and platforms', () => {
    expect(plans.starter.postsPerWeek).toBe(3);
    expect(plans.starter.platforms).toEqual(['instagram', 'facebook']);
    expect(plans.starter.dmAutomation).toBe(false);
    expect(plans.starter.adManagement).toBe(false);
  });
  it('premium has all features enabled', () => {
    expect(plans.premium.postsPerWeek).toBe(7);
    expect(plans.premium.platforms).toContain('google_business');
    expect(plans.premium.dmAutomation).toBe(true);
    expect(plans.premium.adManagement).toBe(true);
  });
  it('each tier has all required fields', () => {
    const requiredFields = ['postsPerWeek', 'platforms', 'reviewResponses', 'dmAutomation', 'adManagement'];
    for (const tier of Object.values(plans)) {
      for (const field of requiredFields) {
        expect(tier).toHaveProperty(field);
      }
    }
  });
});
