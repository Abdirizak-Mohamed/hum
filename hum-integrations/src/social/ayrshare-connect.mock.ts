import type { SocialConnectClient } from './connect-types.js';
import type { Platform } from 'hum-core';

export class MockAyrshareConnectProvider implements SocialConnectClient {
  async createProfile(input: { title: string }): Promise<{ profileKey: string }> {
    return { profileKey: `mock-profile-${Date.now()}` };
  }

  async getConnectUrl(profileKey: string, platform: Platform, callbackUrl: string): Promise<{ url: string }> {
    const params = new URLSearchParams({ profileKey, platform, callbackUrl });
    return { url: `http://localhost:9999/mock-connect?${params.toString()}` };
  }
}
