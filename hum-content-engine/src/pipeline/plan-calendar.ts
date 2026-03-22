import { z } from 'zod';
import type { AiClient, CopyPrompt } from 'hum-integrations';
import type { Platform, MenuItem } from 'hum-core';
import { buildCalendarPrompt } from '../prompts/calendar.js';
import type { ContentEngineConfig } from '../config.js';

export type PlannedPost = {
  date: string;
  contentType: 'food_hero' | 'deal_offer' | 'google_post';
  platforms: Platform[];
  menuItem?: MenuItem | null;
  theme: string;
  brief: string;
};

export type ContentCalendar = {
  clientId: string;
  weekStarting: string;
  posts: PlannedPost[];
};

const plannedPostSchema = z.object({
  date: z.string(),
  contentType: z.enum(['food_hero', 'deal_offer', 'google_post']),
  platforms: z.array(z.string()),
  menuItem: z.object({
    name: z.string(),
    description: z.string(),
    category: z.string(),
    price: z.number(),
  }).nullable().optional(),
  theme: z.string(),
  brief: z.string(),
});

const calendarSchema = z.array(plannedPostSchema);

type ClientInfo = {
  id: string;
  businessName: string;
  address: string | null;
};

type BrandInfo = {
  brandVoiceGuide: string | null;
  menuItems: MenuItem[];
  contentThemes: string[];
  keySellingPoints: string[];
  hashtagStrategy: string[];
};

type PlanCalendarDeps = {
  ai: AiClient;
  config: ContentEngineConfig;
  platforms: Platform[];
  postsPerWeek: number;
  recentMenuItemNames: string[];
};

export async function planCalendar(
  client: ClientInfo,
  brand: BrandInfo,
  deps: PlanCalendarDeps,
): Promise<ContentCalendar> {
  const { ai, config, platforms, postsPerWeek, recentMenuItemNames } = deps;

  const prompt = buildCalendarPrompt(client, brand, {
    postsPerWeek,
    platforms,
    recentMenuItemNames,
  });

  let posts: PlannedPost[];
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    const callPrompt: CopyPrompt = attempt === 0
      ? { ...prompt, model: config.models.planning }
      : {
          systemPrompt: prompt.systemPrompt,
          userPrompt: `Your previous response was invalid JSON: ${String(lastError)}. Please fix and return ONLY a valid JSON array.`,
          model: config.models.planning,
        };

    const result = await ai.generateCopy(callPrompt);

    try {
      const parsed = calendarSchema.parse(JSON.parse(result.text));
      posts = parsed.map((post) => ({
        ...post,
        platforms: post.contentType === 'google_post'
          ? post.platforms as Platform[]
          : post.platforms.filter((p) => platforms.includes(p as Platform)) as Platform[],
      })).filter((post) => post.platforms.length > 0);

      const today = new Date().toISOString().split('T')[0];
      return { clientId: client.id, weekStarting: today, posts };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  throw new Error(`Calendar planning failed after 2 attempts: ${String(lastError)}`);
}
