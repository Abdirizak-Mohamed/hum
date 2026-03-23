import type { Platform, MenuItem } from 'hum-core';
import type { CopyPrompt } from 'hum-integrations';

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
  const contentTypes = ['food_hero', 'deal_offer'];
  if (input.platforms.includes('google_business')) {
    contentTypes.push('google_post');
  }

  const systemPrompt = [
    'You are a social media strategist for restaurants and takeaways.',
    'Plan a content calendar for the next 7 days.',
    `Create exactly ${input.postsPerWeek} posts for the week.`,
    `Content types available: ${contentTypes.join(', ')}.`,
    `Available platforms: ${input.platforms.join(', ')}. ONLY use these platforms.`,
    'Vary content types, menu items, and themes across the week.',
    'IMPORTANT: The menuItem field MUST use items from the provided menu EXACTLY as listed — do not invent dishes. Use the exact name, description, category, and price. Set menuItem to null only for deal_offer posts about general promotions.',
    'Return ONLY valid JSON as an object: { "posts": [...] } where each post has fields: date (ISO string YYYY-MM-DD), contentType, platforms (array), menuItem (object with name/description/category/price or null), theme, brief.',
  ].join('\n');

  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().toLocaleDateString('en-GB', { weekday: 'long' });

  const menuJson = brand.menuItems.map((item) => ({
    name: item.name,
    description: item.description,
    category: item.category,
    price: item.price,
  }));

  const parts: string[] = [
    `Business: ${client.businessName}`,
    client.address ? `Location: ${client.address}` : '',
    `Today: ${today} (${dayOfWeek})`,
    '',
    `Available platforms: ${input.platforms.join(', ')}`,
    '',
    'MENU (use ONLY these items for the menuItem field — copy name, description, category, and price exactly):',
    JSON.stringify(menuJson, null, 2),
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
