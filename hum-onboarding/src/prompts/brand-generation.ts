import type { BrandInput } from 'hum-integrations';
import type { MenuItem } from 'hum-core';
import type { IntakeData } from '../session/types.js';

export function buildBrandInput(intake: IntakeData, menuItems: MenuItem[]): BrandInput {
  // Group menu items by category for a readable description
  const byCategory = new Map<string, MenuItem[]>();
  for (const item of menuItems) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  const menuDescription = Array.from(byCategory.entries())
    .map(([category, items]) => {
      const itemList = items.map((i) => `${i.name} (£${i.price})`).join(', ');
      return `${category}: ${itemList}`;
    })
    .join('\n');

  return {
    businessName: intake.businessName,
    menuDescription,
    cuisineType: intake.cuisineType,
    location: intake.address,
    brandPreferences: intake.brandPreferences,
  };
}
