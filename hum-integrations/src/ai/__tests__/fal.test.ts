import { describe, it, expect } from 'vitest';
import { MockFalProvider } from '../fal.mock.js';

describe('MockFalProvider', () => {
  const provider = new MockFalProvider();

  it('generateImage returns image URLs', async () => {
    const result = await provider.generateImage({
      prompt: 'A delicious burger on a wooden board',
    });

    expect(result.imageUrls).toEqual(expect.any(Array));
    expect(result.imageUrls.length).toBeGreaterThan(0);
    expect(result.imageUrls[0]).toMatch(/^https?:\/\//);
  });

  it('returns requested number of images', async () => {
    const result = await provider.generateImage({
      prompt: 'A delicious burger',
      numImages: 3,
    });

    expect(result.imageUrls).toHaveLength(3);
  });
});
