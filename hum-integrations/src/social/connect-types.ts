import type { Platform } from 'hum-core';

export interface SocialConnectClient {
  createProfile(input: { title: string }): Promise<{ profileKey: string }>;
  getConnectUrl(profileKey: string, platform: Platform, callbackUrl: string): Promise<{ url: string }>;
}
