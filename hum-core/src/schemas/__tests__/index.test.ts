import { describe, it, expect } from 'vitest';
import {
  createClientSchema,
  updateClientSchema,
  createBrandProfileSchema,
  createSocialAccountSchema,
  createContentItemSchema,
} from '../index.js';

describe('validation schemas', () => {
  describe('createClientSchema', () => {
    it('accepts valid client data', () => {
      const result = createClientSchema.safeParse({
        businessName: "Ali's Kebabs",
        email: 'ali@kebabs.com',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing required fields', () => {
      const result = createClientSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('does not require id, createdAt, updatedAt', () => {
      const result = createClientSchema.safeParse({
        businessName: "Ali's Kebabs",
        email: 'ali@kebabs.com',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('id');
        expect(result.data).not.toHaveProperty('createdAt');
        expect(result.data).not.toHaveProperty('updatedAt');
      }
    });
  });

  describe('updateClientSchema', () => {
    it('accepts partial updates', () => {
      const result = updateClientSchema.safeParse({
        businessName: 'New Name',
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty object (no-op update)', () => {
      const result = updateClientSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('createBrandProfileSchema', () => {
    it('requires clientId', () => {
      const result = createBrandProfileSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('accepts valid brand profile', () => {
      const result = createBrandProfileSchema.safeParse({
        clientId: 'some-uuid',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createSocialAccountSchema', () => {
    it('requires clientId, platform, platformAccountId', () => {
      const result = createSocialAccountSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('accepts valid social account', () => {
      const result = createSocialAccountSchema.safeParse({
        clientId: 'some-uuid',
        platform: 'instagram',
        platformAccountId: '12345',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createContentItemSchema', () => {
    it('requires clientId and contentType', () => {
      const result = createContentItemSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('accepts valid content item', () => {
      const result = createContentItemSchema.safeParse({
        clientId: 'some-uuid',
        contentType: 'food_hero',
      });
      expect(result.success).toBe(true);
    });
  });
});
