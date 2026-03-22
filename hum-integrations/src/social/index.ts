import type { SocialClient } from './types.js';
import { AyrshareProvider } from './ayrshare.js';
import { MockAyrshareProvider } from './ayrshare.mock.js';

export type { SocialClient, SchedulePostInput, ScheduledPost, SocialProfile } from './types.js';

export function createSocialClient(config?: { mock?: boolean; apiKey?: string }): SocialClient {
  const useMock = config?.mock ?? process.env.HUM_MOCK_INTEGRATIONS === 'true';

  if (useMock) {
    return new MockAyrshareProvider();
  }

  return new AyrshareProvider({ apiKey: config?.apiKey });
}
