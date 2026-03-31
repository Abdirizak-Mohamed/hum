import { describe, it, expect } from 'vitest';
import { MockAyrshareConnectProvider } from '../ayrshare-connect.mock.js';

describe('MockAyrshareConnectProvider', () => {
  const provider = new MockAyrshareConnectProvider();

  it('createProfile returns a profileKey string', async () => {
    const result = await provider.createProfile({ title: 'Test Business' });
    expect(result.profileKey).toEqual(expect.any(String));
    expect(result.profileKey).toMatch(/^mock-profile-/);
  });

  it('getConnectUrl returns a URL containing platform and callback', async () => {
    const result = await provider.getConnectUrl(
      'profile-123',
      'instagram',
      'https://example.com/callback',
    );
    expect(result.url).toEqual(expect.any(String));
    expect(result.url).toContain('instagram');
    expect(result.url).toContain('https%3A%2F%2Fexample.com%2Fcallback');
    expect(result.url).toContain('profile-123');
  });
});
