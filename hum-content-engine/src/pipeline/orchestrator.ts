import type { AiClient, SocialClient } from 'hum-integrations';
import {
  type Client, type BrandProfile, plans, type Platform,
  socialAccountRepo, logger,
} from 'hum-core';
import type { StorageClient } from '../storage/types.js';
import type { ContentEngineConfig } from '../config.js';
import { planCalendar } from './plan-calendar.js';
import { generateMedia } from './generate-media.js';
import { generateCopy } from './generate-copy.js';
import { composePosts } from './compose-posts.js';
import { schedulePosts } from './schedule-posts.js';

export type PipelineError = {
  step: 'plan' | 'media' | 'copy' | 'compose' | 'schedule';
  postIndex?: number;
  message: string;
  cause?: unknown;
};

export type PipelineResult = {
  clientId: string;
  weekStarting: string;
  planned: number;
  generated: number;
  scheduled: number;
  failed: number;
  errors: PipelineError[];
};

type PipelineDeps = {
  ai: AiClient;
  social: SocialClient;
  storage: StorageClient;
  db: any;
  config: ContentEngineConfig;
};

const MVP_PLATFORMS: Platform[] = ['instagram', 'facebook', 'google_business'];

export async function runPipeline(
  client: Client | { id: string; businessName: string; address: string | null; planTier: string },
  brandProfile: BrandProfile | {
    brandVoiceGuide: string | null;
    menuItems: Array<{ name: string; description: string; category: string; price: number; photoUrl?: string }>;
    contentThemes: string[];
    keySellingPoints: string[];
    hashtagStrategy: string[];
    brandColours: string[];
    peakPostingTimes: Record<string, string[]>;
  },
  deps: PipelineDeps,
): Promise<PipelineResult> {
  const { ai, social, storage, db, config } = deps;
  const errors: PipelineError[] = [];

  const planTier = (client as any).planTier ?? 'starter';
  const planConfig = plans[planTier as keyof typeof plans] ?? plans.starter;
  const allowedPlatforms = planConfig.platforms.filter((p) => MVP_PLATFORMS.includes(p));

  // Step 1: Plan calendar
  let calendar;
  try {
    calendar = await planCalendar(
      { id: client.id, businessName: client.businessName, address: client.address },
      {
        brandVoiceGuide: brandProfile.brandVoiceGuide,
        menuItems: brandProfile.menuItems,
        contentThemes: brandProfile.contentThemes ?? [],
        keySellingPoints: brandProfile.keySellingPoints ?? [],
        hashtagStrategy: brandProfile.hashtagStrategy ?? [],
      },
      { ai, config, platforms: allowedPlatforms, postsPerWeek: planConfig.postsPerWeek, recentMenuItemNames: [] },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Calendar planning failed for ${client.id}: ${message}`);
    return {
      clientId: client.id,
      weekStarting: new Date().toISOString().split('T')[0],
      planned: 0, generated: 0, scheduled: 0, failed: 0,
      errors: [{ step: 'plan', message, cause: err }],
    };
  }

  logger.info(`Planned ${calendar.posts.length} posts for ${client.businessName}`);

  // Steps 2a + 2b: Generate media and copy in parallel
  const [media, copy] = await Promise.all([
    generateMedia(calendar.posts, {
      brandColours: (brandProfile as any).brandColours ?? [],
      brandVoiceGuide: brandProfile.brandVoiceGuide,
    }, client.id, {
      ai,
      storage,
      concurrency: config.concurrency.mediaGeneration,
    }),
    generateCopy(calendar.posts, {
      brandVoiceGuide: brandProfile.brandVoiceGuide,
      keySellingPoints: brandProfile.keySellingPoints ?? [],
      hashtagStrategy: brandProfile.hashtagStrategy ?? [],
    }, {
      ai,
      config,
      concurrency: config.concurrency.copyGeneration,
    }),
  ]);

  logger.info(`Generated ${media.length} media, ${copy.length} copy items`);

  // Step 3: Compose posts
  const composed = await composePosts(
    calendar.posts, media, copy, client.id,
    brandProfile.peakPostingTimes ?? {},
    db,
  );

  logger.info(`Composed ${composed.length} posts`);

  // Step 4: Schedule posts (skip if dry run or no social account)
  let scheduleResult = { scheduled: 0, failed: 0, errors: [] as Array<{ postIndex: number; message: string; cause?: unknown }> };

  if (config.dryRun) {
    logger.info(`Dry run — skipping scheduling, ${composed.length} posts remain as drafts`);
  } else {
    const socialAccounts = await socialAccountRepo.listByClientId(db, client.id);
    const connectedAccount = socialAccounts.find(
      (a) => a.status === 'connected' && a.ayrshareProfileKey,
    );

  if (connectedAccount?.ayrshareProfileKey) {
    scheduleResult = await schedulePosts(
      composed, connectedAccount.ayrshareProfileKey, social, storage, db,
    );
    for (const err of scheduleResult.errors) {
      errors.push({ step: 'schedule', postIndex: err.postIndex, message: err.message, cause: err.cause });
    }
  } else {
    logger.info(`No connected social account for ${client.id} — posts remain as drafts`);
  }
  } // end if (!config.dryRun)

  return {
    clientId: client.id,
    weekStarting: calendar.weekStarting,
    planned: calendar.posts.length,
    generated: composed.length,
    scheduled: scheduleResult.scheduled,
    failed: scheduleResult.failed,
    errors,
  };
}
