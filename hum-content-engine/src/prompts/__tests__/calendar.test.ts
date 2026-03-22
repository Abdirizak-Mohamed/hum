import { describe, it, expect } from 'vitest';
import { buildCalendarPrompt } from '../calendar.js';
import type { Platform } from 'hum-core';

const mockBrandProfile = {
  brandVoiceGuide: 'Warm and friendly',
  menuItems: [
    { name: 'Butter Chicken', description: 'Creamy curry', category: 'Mains', price: 12.99 },
    { name: 'Lamb Kebab', description: 'Grilled lamb', category: 'Mains', price: 10.99 },
  ],
  contentThemes: ['dish spotlights', 'seasonal specials'],
  keySellingPoints: ['Fresh ingredients', 'Family recipes'],
  hashtagStrategy: ['#LocalEats', '#FreshFood'],
};

const mockClient = {
  businessName: "Ali's Kitchen",
  address: 'London, UK',
};

describe('buildCalendarPrompt', () => {
  it('includes business name in user prompt', () => {
    const prompt = buildCalendarPrompt(mockClient, mockBrandProfile, {
      postsPerWeek: 3,
      platforms: ['instagram', 'facebook'] as Platform[],
      recentMenuItemNames: [],
    });
    expect(prompt.userPrompt).toContain("Ali's Kitchen");
  });

  it('includes menu items in user prompt', () => {
    const prompt = buildCalendarPrompt(mockClient, mockBrandProfile, {
      postsPerWeek: 3,
      platforms: ['instagram', 'facebook'] as Platform[],
      recentMenuItemNames: [],
    });
    expect(prompt.userPrompt).toContain('Butter Chicken');
    expect(prompt.userPrompt).toContain('Lamb Kebab');
  });

  it('includes postsPerWeek limit in system prompt', () => {
    const prompt = buildCalendarPrompt(mockClient, mockBrandProfile, {
      postsPerWeek: 5,
      platforms: ['instagram', 'facebook', 'google_business'] as Platform[],
      recentMenuItemNames: [],
    });
    expect(prompt.systemPrompt).toContain('5');
  });

  it('includes available platforms', () => {
    const prompt = buildCalendarPrompt(mockClient, mockBrandProfile, {
      postsPerWeek: 3,
      platforms: ['instagram', 'facebook'] as Platform[],
      recentMenuItemNames: [],
    });
    expect(prompt.userPrompt).toContain('instagram');
    expect(prompt.userPrompt).toContain('facebook');
  });

  it('includes recently posted items to avoid repetition', () => {
    const prompt = buildCalendarPrompt(mockClient, mockBrandProfile, {
      postsPerWeek: 3,
      platforms: ['instagram'] as Platform[],
      recentMenuItemNames: ['Butter Chicken'],
    });
    expect(prompt.userPrompt).toContain('Butter Chicken');
    expect(prompt.userPrompt).toMatch(/avoid|recently|repeat/i);
  });

  it('includes current date', () => {
    const prompt = buildCalendarPrompt(mockClient, mockBrandProfile, {
      postsPerWeek: 3,
      platforms: ['instagram'] as Platform[],
      recentMenuItemNames: [],
    });
    const today = new Date().toISOString().split('T')[0];
    expect(prompt.userPrompt).toContain(today);
  });

  it('sets system prompt to return JSON', () => {
    const prompt = buildCalendarPrompt(mockClient, mockBrandProfile, {
      postsPerWeek: 3,
      platforms: ['instagram'] as Platform[],
      recentMenuItemNames: [],
    });
    expect(prompt.systemPrompt).toMatch(/JSON/i);
  });
});
