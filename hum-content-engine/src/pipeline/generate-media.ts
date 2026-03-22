import PQueue from 'p-queue';
import type { AiClient } from 'hum-integrations';
import { logger } from 'hum-core';
import type { StorageClient } from '../storage/types.js';
import type { PlannedPost } from './plan-calendar.js';
import { buildImagePrompt } from '../prompts/image.js';

export type GeneratedMedia = {
  plannedPost: PlannedPost;
  localPath: string;
  mimeType: string;
};

type BrandInfo = {
  brandColours: string[];
  brandVoiceGuide: string | null;
};

type GenerateMediaDeps = {
  ai: AiClient;
  storage: StorageClient;
  concurrency: number;
};

export async function generateMedia(
  posts: PlannedPost[],
  brand: BrandInfo,
  clientId: string,
  deps: GenerateMediaDeps,
): Promise<GeneratedMedia[]> {
  const { ai, storage, concurrency } = deps;
  const queue = new PQueue({ concurrency });
  const results: GeneratedMedia[] = [];

  const tasks = posts.map((post, index) =>
    queue.add(async () => {
      try {
        const primaryPlatform = post.platforms[0];
        const imagePrompt = buildImagePrompt(post, brand, primaryPlatform);
        const imageResult = await ai.generateImage(imagePrompt);

        if (imageResult.imageUrls.length === 0) {
          logger.warn(`No images returned for post ${index}`);
          return;
        }

        const imageUrl = imageResult.imageUrls[0];
        const response = await fetch(imageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        const ext = 'png';
        const contentId = `${post.date}-${post.contentType}-${index}`;
        const localPath = await storage.save(clientId, contentId, buffer, ext);

        results.push({ plannedPost: post, localPath, mimeType: 'image/png' });
      } catch (err) {
        logger.warn(`Media generation failed for post ${index}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }),
  );

  await Promise.all(tasks);
  return results;
}
