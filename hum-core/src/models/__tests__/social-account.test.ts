import { describe, it, expect } from 'vitest';
import { SocialAccount } from '../social-account.js';

const makeAccount = (overrides = {}) =>
  new SocialAccount({
    id: '01234567-89ab-cdef-0123-456789abcdef', clientId: 'client-uuid',
    platform: 'instagram', platformAccountId: 'ig_12345',
    ayrshareProfileKey: 'profile_abc', status: 'connected',
    createdAt: Date.now(), connectedAt: Date.now(), updatedAt: Date.now(),
    ...overrides,
  });

describe('SocialAccount', () => {
  describe('isConnected', () => {
    it('returns true when connected', () => { expect(makeAccount({ status: 'connected' }).isConnected()).toBe(true); });
    it('returns false when disconnected', () => { expect(makeAccount({ status: 'disconnected' }).isConnected()).toBe(false); });
  });
  describe('needsReconnection', () => {
    it('returns true when expired', () => { expect(makeAccount({ status: 'expired' }).needsReconnection()).toBe(true); });
    it('returns true when disconnected', () => { expect(makeAccount({ status: 'disconnected' }).needsReconnection()).toBe(true); });
    it('returns false when connected', () => { expect(makeAccount({ status: 'connected' }).needsReconnection()).toBe(false); });
  });
});
