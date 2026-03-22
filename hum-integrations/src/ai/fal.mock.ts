import type { ImagePrompt, ImageResult } from './types.js';

export class MockFalProvider {
  async generateImage(prompt: ImagePrompt): Promise<ImageResult> {
    const count = prompt.numImages ?? 1;
    const imageUrls = Array.from(
      { length: count },
      (_, i) => `https://mock.fal.ai/images/generated-${i + 1}.png`,
    );
    return { imageUrls };
  }
}
