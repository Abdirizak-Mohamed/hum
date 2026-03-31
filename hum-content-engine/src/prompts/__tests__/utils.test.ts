import { describe, it, expect } from 'vitest';
import { injectBrandVoice, formatMenuItems, selectImageSize } from '../utils.js';
import type { MenuItem } from 'hum-core';

describe('injectBrandVoice', () => {
  it('returns brand voice when provided', () => {
    const result = injectBrandVoice('Warm and welcoming');
    expect(result).toContain('Warm and welcoming');
  });

  it('returns default when null', () => {
    const result = injectBrandVoice(null);
    expect(result).toContain('friendly');
  });
});

describe('formatMenuItems', () => {
  it('formats menu items as a readable list', () => {
    const items: MenuItem[] = [
      { name: 'Butter Chicken', description: 'Creamy tomato curry', category: 'Mains', price: 12.99 },
      { name: 'Naan', description: 'Freshly baked bread', category: 'Sides', price: 3.50 },
    ];
    const result = formatMenuItems(items);
    expect(result).toContain('Butter Chicken');
    expect(result).toContain('12.99');
    expect(result).toContain('Mains');
  });

  it('returns empty string for empty array', () => {
    expect(formatMenuItems([])).toBe('');
  });
});

describe('selectImageSize', () => {
  it('maps instagram to square_hd', () => {
    expect(selectImageSize('instagram')).toBe('square_hd');
  });

  it('maps facebook to landscape_4_3', () => {
    expect(selectImageSize('facebook')).toBe('landscape_4_3');
  });

  it('maps google_business to landscape_4_3', () => {
    expect(selectImageSize('google_business')).toBe('landscape_4_3');
  });

  it('defaults to portrait_hd for tiktok', () => {
    expect(selectImageSize('tiktok')).toBe('portrait_hd');
  });
});
