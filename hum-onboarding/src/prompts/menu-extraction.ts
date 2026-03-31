import type { CopyPrompt } from 'hum-integrations';

export function buildMenuExtractionPrompt(menuText: string): CopyPrompt {
  const systemPrompt = `You are a menu data extraction specialist for takeaway restaurants. Given a menu in plain text, extract each item and return a JSON array of objects.

Each object must have these exact fields:
- name (string): the dish name
- description (string): a short description — if not provided in the menu, write a brief one based on the dish name and category
- category (string): e.g., "Starters", "Mains", "Sides", "Desserts", "Drinks", "Meal Deals"
- price (number): the price as a number (no currency symbol). If a range, use the lowest price. If no price, use 0.

Understand common takeaway menu conventions:
- Numbered items (e.g., "1. Chicken Tikka") are individual dishes
- Meal deals / combos should be their own category
- "Extras" or "Add-ons" are a separate category
- Sizes (Regular/Large) should be listed as the base item with the lowest price

Return ONLY a valid JSON array. No markdown, no explanation.`;

  return {
    systemPrompt,
    userPrompt: menuText,
    maxTokens: 4000,
  };
}
