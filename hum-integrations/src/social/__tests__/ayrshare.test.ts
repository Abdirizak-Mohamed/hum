import { describe, it, expect } from 'vitest';
import { MockAyrshareProvider } from '../ayrshare.mock.js';

describe('MockAyrshareProvider', () => {
  const provider = new MockAyrshareProvider();

  it('schedulePost returns a scheduled post', async () => {
    const result = await provider.schedulePost({
      profileKey: 'profile-123',
      post: 'Check out our new burger!',
      platforms: ['instagram', 'facebook'],
    });

    expect(result.id).toEqual(expect.any(String));
    expect(result.status).toBe('scheduled');
    expect(result.postIds).toEqual(expect.any(Object));
  });

  it('getProfiles returns profiles', async () => {
    const profiles = await provider.getProfiles();
    expect(profiles).toEqual(expect.any(Array));
    expect(profiles.length).toBeGreaterThan(0);
    expect(profiles[0].profileKey).toEqual(expect.any(String));
    expect(profiles[0].activePlatforms).toEqual(expect.any(Array));
  });

  it('deletePost resolves without error', async () => {
    await expect(provider.deletePost('post-123')).resolves.toBeUndefined();
  });
});
