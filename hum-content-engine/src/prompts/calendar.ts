import type { Platform, MenuItem } from 'hum-core';
import type { CopyPrompt } from 'hum-integrations';
import { formatMenuItems } from './utils.js';

type CalendarPromptInput = {
  postsPerWeek: number;
  platforms: Platform[];
  recentMenuItemNames: string[];
};

type ClientInfo = {
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

export function buildCalendarPrompt(
  client: ClientInfo,
  brand: BrandInfo,
  input: CalendarPromptInput,
): CopyPrompt {
  const systemPrompt = [
    'You are a social media strategist for restaurants and takeaways.',
    'Plan a content calendar for the next 7 days.',
    `Create exactly ${input.postsPerWeek} posts for the week.`,
    'Content types available: food_hero, deal_offer, google_post.',
    'Vary content types, menu items, and themes across the week.',
    'Return ONLY valid JSON: an array of objects with fields: date (ISO string YYYY-MM-DD), contentType, platforms (array), menuItem (object with name/description/category/price or null), theme, brief.',
  ].join('\n');

  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().toLocaleDateString('en-GB', { weekday: 'long' });

  const parts: string[] = [
    `Business: ${client.businessName}`,
    client.address ? `Location: ${client.address}` : '',
    `Today: ${today} (${dayOfWeek})`,
    '',
    `Available platforms: ${input.platforms.join(', ')}`,
    '',
    'Menu items:',
    formatMenuItems(brand.menuItems) || '(No menu items provided)',
    '',
    `Brand voice: ${brand.brandVoiceGuide ?? 'Friendly and approachable'}`,
    `Content themes: ${brand.contentThemes.join(', ') || 'General food content'}`,
    `Key selling points: ${brand.keySellingPoints.join(', ') || 'Quality food'}`,
  ];

  if (input.recentMenuItemNames.length > 0) {
    parts.push('');
    parts.push(`Recently posted — avoid repeating these menu items: ${input.recentMenuItemNames.join(', ')}`);
  }

  return {
    systemPrompt,
    userPrompt: parts.filter((line) => line !== undefined).join('\n'),
  };
}
