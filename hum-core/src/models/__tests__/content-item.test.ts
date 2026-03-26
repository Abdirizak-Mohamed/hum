import { describe, it, expect } from 'vitest';
import { ContentItem } from '../content-item.js';

const makeItem = (overrides = {}) =>
  new ContentItem({
    id: '01234567-89ab-cdef-0123-456789abcdef', clientId: 'client-uuid',
    contentType: 'food_hero', status: 'draft',
    caption: 'Check out our new lamb doner!', hashtags: ['#kebabs', '#food'],
    cta: 'Order now on Deliveroo', mediaUrls: ['https://example.com/photo.jpg'],
    platforms: ['instagram', 'facebook'],
    scheduledAt: null, postedAt: null, performance: null,
    createdAt: Date.now(), updatedAt: Date.now(),
    ...overrides,
  });

describe('ContentItem', () => {
  describe('canPublish', () => {
    it('true when scheduled', () => { expect(makeItem({ status: 'scheduled' }).canPublish()).toBe(true); });
    it('true when draft', () => { expect(makeItem({ status: 'draft' }).canPublish()).toBe(true); });
    it('false when posted', () => { expect(makeItem({ status: 'posted' }).canPublish()).toBe(false); });
    it('false when failed', () => { expect(makeItem({ status: 'failed' }).canPublish()).toBe(false); });
  });
  describe('isOverdue', () => {
    it('true when scheduled in the past and not posted', () => {
      expect(makeItem({ status: 'scheduled', scheduledAt: Date.now() - 60000 }).isOverdue()).toBe(true);
    });
    it('false when scheduled in the future', () => {
      expect(makeItem({ status: 'scheduled', scheduledAt: Date.now() + 60000 }).isOverdue()).toBe(false);
    });
    it('false when not scheduled', () => { expect(makeItem({ scheduledAt: null }).isOverdue()).toBe(false); });
    it('false when already posted', () => {
      expect(makeItem({ status: 'posted', scheduledAt: Date.now() - 60000 }).isOverdue()).toBe(false);
    });
  });
  describe('hasMedia', () => {
    it('true when mediaUrls is non-empty', () => { expect(makeItem({ mediaUrls: ['url'] }).hasMedia()).toBe(true); });
    it('false when mediaUrls is empty', () => { expect(makeItem({ mediaUrls: [] }).hasMedia()).toBe(false); });
  });
});
