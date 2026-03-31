import type { SocialClient } from 'hum-integrations';
import { contentItemRepo, logger } from 'hum-core';
import type { StorageClient } from '../storage/types.js';
import type { ComposedPost } from './compose-posts.js';

type ScheduleResult = {
  scheduled: number;
  failed: number;
  errors: Array<{ postIndex: number; message: string; cause?: unknown }>;
};

export async function schedulePosts(
  posts: ComposedPost[],
  profileKey: string,
  social: SocialClient,
  storage: StorageClient,
  db: any,
): Promise<ScheduleResult> {
  let scheduled = 0;
  let failed = 0;
  const errors: ScheduleResult['errors'] = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    try {
      const mediaUrl = storage.getUrl(post.mediaPath);

      await social.schedulePost({
        profileKey,
        post: post.caption,
        platforms: [post.platform],
        mediaUrls: [mediaUrl],
        scheduledDate: post.scheduledAt,
        hashtags: post.hashtags,
      });

      await contentItemRepo.update(db, post.contentItemId, { status: 'scheduled' });
      scheduled++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`Scheduling failed for post ${i}: ${message}`);
      errors.push({ postIndex: i, message, cause: err });

      try {
        await contentItemRepo.update(db, post.contentItemId, { status: 'failed' });
      } catch {
        // best-effort status update
      }
      failed++;
    }
  }

  return { scheduled, failed, errors };
}
