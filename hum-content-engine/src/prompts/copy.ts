import type { CopyPrompt } from 'hum-integrations';
import type { MenuItem } from 'hum-core';
import { injectBrandVoice } from './utils.js';

type CopyPromptInput = {
  contentType: 'food_hero' | 'deal_offer' | 'google_post';
  menuItem: MenuItem | null | undefined;
  theme: string;
  brief: string;
};

type BrandInfo = {
  brandVoiceGuide: string | null;
  keySellingPoints: string[];
  hashtagStrategy: string[];
};

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  instagram: [
    'Platform: Instagram.',
    'Tone: aspirational, storytelling, appetizing.',
    'Include 3-5 relevant hashtags from the brand strategy.',
    'Maximum caption length: 2200 characters.',
  ].join(' '),
  facebook: [
    'Platform: Facebook.',
    'Tone: community-oriented, informative.',
    'Include a clear CTA (call to action).',
    'Include 1-2 hashtags maximum.',
    'Maximum caption length: 63206 characters.',
  ].join(' '),
  google_business: [
    'Platform: Google Business Profile.',
    'Tone: concise, keyword-rich, offer-focused.',
    'No hashtags.',
    'Maximum caption length: 1500 characters.',
  ].join(' '),
};

export function buildCopyPrompt(
  post: CopyPromptInput,
  brand: BrandInfo,
  platform: string,
): CopyPrompt {
  const platformInstructions = PLATFORM_INSTRUCTIONS[platform] ?? PLATFORM_INSTRUCTIONS.instagram;

  const systemPrompt = [
    'You write social media captions for restaurants and takeaways.',
    injectBrandVoice(brand.brandVoiceGuide),
    platformInstructions,
    'Return ONLY valid JSON (no markdown, no code fences) with fields: caption (string), hashtags (string[]), cta (string).',
  ].join('\n');

  const parts: string[] = [
    `Content type: ${post.contentType}`,
    `Theme: ${post.theme}`,
    `Brief: ${post.brief}`,
  ];

  if (post.menuItem) {
    parts.push(`Dish: ${post.menuItem.name} — ${post.menuItem.description} (£${post.menuItem.price.toFixed(2)})`);
  }

  if (brand.keySellingPoints.length > 0) {
    parts.push(`Key selling points: ${brand.keySellingPoints.join(', ')}`);
  }

  if (brand.hashtagStrategy.length > 0) {
    parts.push(`Brand hashtag pool: ${brand.hashtagStrategy.join(', ')}`);
  }

  return {
    systemPrompt,
    userPrompt: parts.join('\n'),
  };
}
