import type { SocialClient } from './types.js';
import type { SocialConnectClient } from './connect-types.js';
import { AyrshareProvider } from './ayrshare.js';
import { MockAyrshareProvider } from './ayrshare.mock.js';
import { MockAyrshareConnectProvider } from './ayrshare-connect.mock.js';

export type { SocialClient, SchedulePostInput, ScheduledPost, SocialProfile } from './types.js';
export type { SocialConnectClient } from './connect-types.js';

export function createSocialClient(config?: { mock?: boolean; apiKey?: string }): SocialClient {
  const useMock = config?.mock ?? process.env.HUM_MOCK_INTEGRATIONS === 'true';

  if (useMock) {
    return new MockAyrshareProvider();
  }

  return new AyrshareProvider({ apiKey: config?.apiKey });
}

export function createSocialConnectClient(config?: { mock?: boolean; apiKey?: string }): SocialConnectClient {
  const useMock = config?.mock ?? process.env.HUM_MOCK_INTEGRATIONS === 'true';

  if (useMock) {
    return new MockAyrshareConnectProvider();
  }

  return new AyrshareProvider({ apiKey: config?.apiKey });
}
