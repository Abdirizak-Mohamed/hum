import { describe, it, expect } from 'vitest';
import { buildBrandInput } from '../brand-generation.js';

describe('buildBrandInput', () => {
  it('builds BrandInput from intake data and menu items', () => {
    const input = buildBrandInput(
      {
        businessName: "Ali's Kebabs",
        email: 'ali@kebabs.com',
        menu: 'raw menu text',
        address: 'London',
        cuisineType: 'Turkish',
        brandPreferences: 'Modern and vibrant',
      },
      [
        { name: 'Chicken Kebab', description: 'Grilled chicken', category: 'Mains', price: 7.99 },
      ],
    );

    expect(input.businessName).toBe("Ali's Kebabs");
    expect(input.menuDescription).toContain('Chicken Kebab');
    expect(input.cuisineType).toBe('Turkish');
    expect(input.location).toBe('London');
    expect(input.brandPreferences).toBe('Modern and vibrant');
  });

  it('formats menu items into a readable description', () => {
    const input = buildBrandInput(
      { businessName: 'Test', email: 'a@b.com', menu: 'x' },
      [
        { name: 'Burger', description: 'Beef patty', category: 'Mains', price: 9.99 },
        { name: 'Fries', description: 'Crispy', category: 'Sides', price: 2.99 },
      ],
    );

    expect(input.menuDescription).toContain('Mains');
    expect(input.menuDescription).toContain('Burger');
    expect(input.menuDescription).toContain('Sides');
  });
});
