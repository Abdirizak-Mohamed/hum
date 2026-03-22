import type { SocialClient, SchedulePostInput, ScheduledPost, SocialProfile } from './types.js';

export class MockAyrshareProvider implements SocialClient {
  async schedulePost(input: SchedulePostInput): Promise<ScheduledPost> {
    const postIds: ScheduledPost['postIds'] = {};
    for (const platform of input.platforms) {
      postIds[platform] = `mock-${platform}-${Date.now()}`;
    }

    return {
      id: `mock-post-${Date.now()}`,
      status: 'scheduled',
      postIds,
    };
  }

  async getProfiles(): Promise<SocialProfile[]> {
    return [
      {
        profileKey: 'mock-profile-1',
        activePlatforms: ['instagram', 'facebook'],
      },
    ];
  }

  async deletePost(_postId: string): Promise<void> {
    // no-op
  }
}
