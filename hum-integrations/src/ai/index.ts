import type { AiClient } from './types.js';
import { OpenAiProvider } from './openai.js';
import { MockOpenAiProvider } from './openai.mock.js';
import { FalProvider } from './fal.js';
import { MockFalProvider } from './fal.mock.js';

export type { AiClient, CopyPrompt, CopyResult, BrandInput, BrandProfileResult, ImagePrompt, ImageResult } from './types.js';

class CompositeAiClient implements AiClient {
  constructor(
    private copyProvider: OpenAiProvider | MockOpenAiProvider,
    private imageProvider: FalProvider | MockFalProvider,
  ) {}

  generateCopy(...args: Parameters<AiClient['generateCopy']>) {
    return this.copyProvider.generateCopy(...args);
  }

  generateBrandProfile(...args: Parameters<AiClient['generateBrandProfile']>) {
    return this.copyProvider.generateBrandProfile(...args);
  }

  generateImage(...args: Parameters<AiClient['generateImage']>) {
    return this.imageProvider.generateImage(...args);
  }
}

export function createAiClient(config?: { mock?: boolean }): AiClient {
  const useMock = config?.mock ?? process.env.HUM_MOCK_INTEGRATIONS === 'true';

  if (useMock) {
    return new CompositeAiClient(new MockOpenAiProvider(), new MockFalProvider());
  }

  return new CompositeAiClient(new OpenAiProvider(), new FalProvider());
}
