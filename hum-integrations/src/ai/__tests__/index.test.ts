import { describe, it, expect } from 'vitest';
import { createAiClient } from '../index.js';

describe('createAiClient', () => {
  it('returns mock client when mock=true', async () => {
    const client = createAiClient({ mock: true });

    const copy = await client.generateCopy({
      systemPrompt: 'test',
      userPrompt: 'test',
    });
    expect(copy.text).toEqual(expect.any(String));

    const brand = await client.generateBrandProfile({
      businessName: 'Test',
      menuDescription: 'Test menu',
    });
    expect(brand.keySellingPoints).toEqual(expect.any(Array));

    const image = await client.generateImage({ prompt: 'test' });
    expect(image.imageUrls).toEqual(expect.any(Array));
  });

  it('returns mock client when HUM_MOCK_INTEGRATIONS is set', async () => {
    const original = process.env.HUM_MOCK_INTEGRATIONS;
    process.env.HUM_MOCK_INTEGRATIONS = 'true';

    const client = createAiClient();
    const copy = await client.generateCopy({
      systemPrompt: 'test',
      userPrompt: 'test',
    });
    expect(copy.text).toEqual(expect.any(String));

    process.env.HUM_MOCK_INTEGRATIONS = original;
  });
});
