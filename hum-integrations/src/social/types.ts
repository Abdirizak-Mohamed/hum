import type { Platform } from 'hum-core';

export type SchedulePostInput = {
  profileKey: string;
  post: string;
  platforms: Platform[];
  mediaUrls?: string[];
  scheduledDate?: string;
  hashtags?: string[];
};

export type ScheduledPost = {
  id: string;
  status: string;
  postIds: Partial<Record<Platform, string>>;
};

export type SocialProfile = {
  profileKey: string;
  activePlatforms: Platform[];
};

export interface SocialClient {
  schedulePost(input: SchedulePostInput): Promise<ScheduledPost>;
  getProfiles(): Promise<SocialProfile[]>;
  deletePost(postId: string): Promise<void>;
}
