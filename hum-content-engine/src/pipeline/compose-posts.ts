import { contentItemRepo, platformSpecs, type Platform } from 'hum-core';
import type { PlannedPost } from './plan-calendar.js';
import type { GeneratedMedia } from './generate-media.js';
import type { GeneratedCopy } from './generate-copy.js';

export type ComposedPost = {
  plannedPost: PlannedPost;
  platform: Platform;
  caption: string;
  hashtags: string[];
  cta: string;
  mediaPath: string;
  scheduledAt: string;
  contentItemId: string;
};

function findMedia(post: PlannedPost, mediaList: GeneratedMedia[]): GeneratedMedia | undefined {
  return mediaList.find((m) => m.plannedPost === post);
}

function findCopy(post: PlannedPost, platform: Platform, copyList: GeneratedCopy[]): GeneratedCopy | undefined {
  return copyList.find((c) => c.plannedPost === post && c.platform === platform);
}

function deduplicateHashtags(hashtags: string[]): string[] {
  return [...new Set(hashtags)];
}

function truncateCaption(caption: string, platform: Platform): string {
  const maxLen = platformSpecs[platform]?.maxCaptionLength ?? 2200;
  return caption.length > maxLen ? caption.slice(0, maxLen) : caption;
}

function pickScheduledTime(
  date: string,
  platform: Platform,
  peakPostingTimes: Record<string, string[]>,
  usedSlots: Set<string>,
): string {
  const times = peakPostingTimes[platform] ?? ['12:00'];
  for (const time of times) {
    const slot = `${date}T${time}`;
    if (!usedSlots.has(slot)) {
      usedSlots.add(slot);
      return `${date}T${time}:00.000Z`;
    }
  }
  // All slots used, pick the first
  return `${date}T${times[0]}:00.000Z`;
}

export async function composePosts(
  posts: PlannedPost[],
  media: GeneratedMedia[],
  copy: GeneratedCopy[],
  clientId: string,
  peakPostingTimes: Record<string, string[]>,
  db: any,
): Promise<ComposedPost[]> {
  const results: ComposedPost[] = [];
  const usedSlots = new Set<string>();

  for (const post of posts) {
    const postMedia = findMedia(post, media);
    if (!postMedia) continue;

    for (const platform of post.platforms) {
      const postCopy = findCopy(post, platform, copy);
      if (!postCopy) continue;

      const caption = truncateCaption(postCopy.caption, platform);
      const hashtags = deduplicateHashtags(postCopy.hashtags);
      const scheduledAt = pickScheduledTime(post.date, platform, peakPostingTimes, usedSlots);

      const contentItem = await contentItemRepo.create(db, {
        clientId,
        contentType: post.contentType,
        status: 'draft',
        caption,
        hashtags,
        cta: postCopy.cta,
        mediaUrls: [postMedia.localPath],
        platforms: [platform],
        scheduledAt: new Date(scheduledAt),
      });

      results.push({
        plannedPost: post,
        platform,
        caption,
        hashtags,
        cta: postCopy.cta,
        mediaPath: postMedia.localPath,
        scheduledAt,
        contentItemId: contentItem.id,
      });
    }
  }

  return results;
}
