import { describe, it, expect } from 'vitest';
import { BrandProfile } from '../brand-profile.js';

const makeProfile = (overrides = {}) =>
  new BrandProfile({
    id: '01234567-89ab-cdef-0123-456789abcdef', clientId: 'client-uuid',
    brandVoiceGuide: 'Friendly, casual, food-loving',
    keySellingPoints: ['Fresh ingredients', 'Family recipes'],
    targetAudienceProfile: 'Local families and students',
    contentThemes: ['food photography', 'behind the scenes'],
    hashtagStrategy: ['#kebabs', '#freshfood', '#localfood'],
    peakPostingTimes: { instagram: ['12:00', '18:00'], facebook: ['12:00'] },
    menuItems: [{ name: 'Lamb Doner', description: 'Slow-roasted lamb', category: 'Mains', price: 8.99 }],
    brandColours: ['#FF5733', '#33FF57'],
    logoUrl: 'https://example.com/logo.png',
    generatedAt: new Date(), updatedAt: new Date(),
    ...overrides,
  });

describe('BrandProfile', () => {
  describe('addMenuItem', () => {
    it('adds a new item to menuItems', () => {
      const profile = makeProfile();
      profile.addMenuItem({ name: 'Chicken Wrap', description: 'Grilled chicken', category: 'Mains', price: 7.99 });
      expect(profile.menuItems).toHaveLength(2);
      expect(profile.menuItems[1].name).toBe('Chicken Wrap');
    });
  });
  describe('getHashtagsForPlatform', () => {
    it('returns hashtags when platform supports them', () => { expect(makeProfile().getHashtagsForPlatform('instagram')).toEqual(['#kebabs', '#freshfood', '#localfood']); });
    it('returns empty array for platforms that do not support hashtags', () => { expect(makeProfile().getHashtagsForPlatform('google_business')).toEqual([]); });
  });
});
