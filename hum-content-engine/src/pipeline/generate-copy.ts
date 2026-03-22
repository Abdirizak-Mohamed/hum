import { z } from 'zod';
import PQueue from 'p-queue';
import type { AiClient } from 'hum-integrations';
import type { Platform } from 'hum-core';
import { logger } from 'hum-core';
import type { PlannedPost } from './plan-calendar.js';
import type { ContentEngineConfig } from '../config.js';
import { buildCopyPrompt } from '../prompts/copy.js';

export type GeneratedCopy = {
  plannedPost: PlannedPost;
  platform: Platform;
  caption: string;
  hashtags: string[];
  cta: string;
};

type BrandInfo = {
  brandVoiceGuide: string | null;
  keySellingPoints: string[];
  hashtagStrategy: string[];
};

type GenerateCopyDeps = {
  ai: AiClient;
  config: ContentEngineConfig;
  concurrency: number;
};

const copyResultSchema = z.object({
  caption: z.string(),
  hashtags: z.array(z.string()).default([]),
  cta: z.string().default(''),
});

export async function generateCopy(
  posts: PlannedPost[],
  brand: BrandInfo,
  deps: GenerateCopyDeps,
): Promise<GeneratedCopy[]> {
  const { ai, config, concurrency } = deps;
  const queue = new PQueue({ concurrency });
  const results: GeneratedCopy[] = [];

  // Flatten: one task per post x platform
  const tasks: Array<{ post: PlannedPost; platform: Platform }> = [];
  for (const post of posts) {
    for (const platform of post.platforms) {
      tasks.push({ post, platform });
    }
  }

  const promises = tasks.map(({ post, platform }, index) =>
    queue.add(async () => {
      try {
        const prompt = buildCopyPrompt(post, brand, platform);
        const result = await ai.generateCopy({ ...prompt, model: config.models.copy });
        const parsed = copyResultSchema.parse(JSON.parse(result.text));

        results.push({
          plannedPost: post,
          platform,
          caption: parsed.caption,
          hashtags: parsed.hashtags,
          cta: parsed.cta,
        });
      } catch (err) {
        logger.warn(`Copy generation failed for post ${index} (${platform}): ${err instanceof Error ? err.message : String(err)}`);
      }
    }),
  );

  await Promise.all(promises);
  return results;
}
