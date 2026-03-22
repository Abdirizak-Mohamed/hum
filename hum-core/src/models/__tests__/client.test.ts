import { describe, it, expect } from 'vitest';
import { Client } from '../client.js';
import { plans } from '../../config/plans.js';

const makeClient = (overrides = {}) =>
  new Client({
    id: '01234567-89ab-cdef-0123-456789abcdef',
    businessName: "Ali's Kebabs",
    address: '123 High Street',
    latitude: 51.5074,
    longitude: -0.1278,
    phone: '07700900000',
    email: 'ali@kebabs.com',
    openingHours: { mon: '11:00-23:00' },
    deliveryPlatforms: ['deliveroo', 'uber_eats'],
    planTier: 'growth' as const,
    stripeCustomerId: 'cus_123',
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

describe('Client', () => {
  it('exposes all properties from the row', () => {
    const client = makeClient();
    expect(client.businessName).toBe("Ali's Kebabs");
    expect(client.email).toBe('ali@kebabs.com');
  });
  describe('isActive', () => {
    it('returns true when status is active', () => { expect(makeClient({ status: 'active' }).isActive()).toBe(true); });
    it('returns false when status is paused', () => { expect(makeClient({ status: 'paused' }).isActive()).toBe(false); });
  });
  describe('canUpgradeTo', () => {
    it('can upgrade from starter to growth', () => { expect(makeClient({ planTier: 'starter' }).canUpgradeTo('growth')).toBe(true); });
    it('cannot upgrade to same tier', () => { expect(makeClient({ planTier: 'growth' }).canUpgradeTo('growth')).toBe(false); });
    it('cannot downgrade from premium to starter', () => { expect(makeClient({ planTier: 'premium' }).canUpgradeTo('starter')).toBe(false); });
  });
  describe('getPlanConfig', () => {
    it('returns the config for the current tier', () => { expect(makeClient({ planTier: 'growth' }).getPlanConfig()).toEqual(plans.growth); });
  });
});
