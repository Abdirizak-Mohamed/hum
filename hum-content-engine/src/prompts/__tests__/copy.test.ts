import { describe, it, expect } from 'vitest';
import { buildCopyPrompt } from '../copy.js';

const mockBrandProfile = {
  brandVoiceGuide: 'Warm and casual',
  keySellingPoints: ['Fresh ingredients', 'Fast delivery'],
  hashtagStrategy: ['#LocalEats', '#FreshFood', '#FoodDelivery'],
};

const mockPost = {
  contentType: 'food_hero' as const,
  menuItem: { name: 'Butter Chicken', description: 'Creamy curry', category: 'Mains', price: 12.99 },
  theme: 'Friday feast',
  brief: 'Hero shot of butter chicken',
};

describe('buildCopyPrompt', () => {
  it('includes brand voice in system prompt', () => {
    const result = buildCopyPrompt(mockPost, mockBrandProfile, 'instagram');
    expect(result.systemPrompt).toContain('Warm and casual');
  });

  it('includes menu item in user prompt', () => {
    const result = buildCopyPrompt(mockPost, mockBrandProfile, 'instagram');
    expect(result.userPrompt).toContain('Butter Chicken');
  });

  it('includes Instagram-specific instructions', () => {
    const result = buildCopyPrompt(mockPost, mockBrandProfile, 'instagram');
    expect(result.systemPrompt).toMatch(/hashtag/i);
    expect(result.systemPrompt).toContain('2200');
  });

  it('includes Facebook-specific instructions', () => {
    const result = buildCopyPrompt(mockPost, mockBrandProfile, 'facebook');
    expect(result.systemPrompt).toMatch(/community|CTA/i);
  });

  it('includes Google Business-specific instructions', () => {
    const result = buildCopyPrompt(mockPost, mockBrandProfile, 'google_business');
    expect(result.systemPrompt).toMatch(/concise|keyword/i);
    expect(result.systemPrompt).toContain('1500');
  });

  it('instructs LLM to return JSON', () => {
    const result = buildCopyPrompt(mockPost, mockBrandProfile, 'instagram');
    expect(result.systemPrompt).toMatch(/JSON/i);
    expect(result.systemPrompt).toMatch(/caption/i);
    expect(result.systemPrompt).toMatch(/hashtags/i);
    expect(result.systemPrompt).toMatch(/cta/i);
  });

  it('includes hashtag strategy', () => {
    const result = buildCopyPrompt(mockPost, mockBrandProfile, 'instagram');
    expect(result.userPrompt).toContain('#LocalEats');
  });
});
