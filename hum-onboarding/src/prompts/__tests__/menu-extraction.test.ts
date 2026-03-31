import { describe, it, expect } from 'vitest';
import { buildMenuExtractionPrompt } from '../menu-extraction.js';

describe('buildMenuExtractionPrompt', () => {
  it('builds a prompt with the menu text', () => {
    const prompt = buildMenuExtractionPrompt('Chicken Kebab £7.99\nLamb Doner £8.99');
    expect(prompt.systemPrompt).toContain('menu');
    expect(prompt.systemPrompt).toContain('JSON');
    expect(prompt.userPrompt).toContain('Chicken Kebab');
    expect(prompt.userPrompt).toContain('Lamb Doner');
  });

  it('instructs the LLM to return MenuItem[] shape', () => {
    const prompt = buildMenuExtractionPrompt('test');
    expect(prompt.systemPrompt).toContain('name');
    expect(prompt.systemPrompt).toContain('description');
    expect(prompt.systemPrompt).toContain('category');
    expect(prompt.systemPrompt).toContain('price');
  });
});
