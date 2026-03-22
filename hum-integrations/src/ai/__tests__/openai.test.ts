import { describe, it, expect } from 'vitest';
import { MockOpenAiProvider } from '../openai.mock.js';

describe('MockOpenAiProvider', () => {
  const provider = new MockOpenAiProvider();

  it('generateCopy returns realistic mock data', async () => {
    const result = await provider.generateCopy({
      systemPrompt: 'You are a copywriter',
      userPrompt: 'Write a caption for a burger post',
    });

    expect(result.text).toEqual(expect.any(String));
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.usage.promptTokens).toEqual(expect.any(Number));
    expect(result.usage.completionTokens).toEqual(expect.any(Number));
  });

  it('generateBrandProfile returns all required fields', async () => {
    const result = await provider.generateBrandProfile({
      businessName: "Ali's Kebabs",
      menuDescription: 'Kebabs, wraps, and platters',
    });

    expect(result.brandVoiceGuide).toEqual(expect.any(String));
    expect(result.keySellingPoints).toEqual(expect.any(Array));
    expect(result.keySellingPoints.length).toBeGreaterThan(0);
    expect(result.targetAudienceProfile).toEqual(expect.any(String));
    expect(result.contentThemes).toEqual(expect.any(Array));
    expect(result.hashtagStrategy).toEqual(expect.any(Array));
  });
});
