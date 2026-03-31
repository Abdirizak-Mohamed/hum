import { describe, it, expect } from 'vitest';
import { buildImagePrompt } from '../image.js';
import type { Platform } from 'hum-core';

const mockBrandProfile = {
  brandColours: ['#FF5733', '#C70039'],
  brandVoiceGuide: 'Bold and vibrant',
};

describe('buildImagePrompt', () => {
  it('builds a food_hero prompt with dish details', () => {
    const result = buildImagePrompt(
      {
        contentType: 'food_hero',
        menuItem: { name: 'Butter Chicken', description: 'Creamy tomato curry', category: 'Mains', price: 12.99 },
        theme: 'Friday feast',
        brief: 'Hero shot of butter chicken',
      },
      mockBrandProfile,
      'instagram',
    );
    expect(result.prompt).toContain('Butter Chicken');
    expect(result.prompt).toMatch(/food photography/i);
    expect(result.imageSize).toBe('square_hd');
  });

  it('builds a deal_offer prompt with brand colours', () => {
    const result = buildImagePrompt(
      {
        contentType: 'deal_offer',
        menuItem: null,
        theme: '2-for-1 Monday',
        brief: 'Monday deal promotion',
      },
      mockBrandProfile,
      'facebook',
    );
    expect(result.prompt).toContain('2-for-1 Monday');
    expect(result.prompt).toMatch(/promotional/i);
    expect(result.imageSize).toBe('landscape_4_3');
  });

  it('builds a google_post prompt', () => {
    const result = buildImagePrompt(
      {
        contentType: 'google_post',
        menuItem: { name: 'Fish & Chips', description: 'Classic British', category: 'Mains', price: 9.99 },
        theme: 'Weekend special',
        brief: 'Google update',
      },
      mockBrandProfile,
      'google_business',
    );
    expect(result.prompt).toMatch(/clean|professional|bright/i);
    expect(result.imageSize).toBe('landscape_4_3');
  });

  it('sets correct image size per platform', () => {
    const igResult = buildImagePrompt(
      { contentType: 'food_hero', menuItem: null, theme: 'test', brief: 'test' },
      mockBrandProfile,
      'instagram',
    );
    expect(igResult.imageSize).toBe('square_hd');

    const fbResult = buildImagePrompt(
      { contentType: 'food_hero', menuItem: null, theme: 'test', brief: 'test' },
      mockBrandProfile,
      'facebook',
    );
    expect(fbResult.imageSize).toBe('landscape_4_3');
  });
});
