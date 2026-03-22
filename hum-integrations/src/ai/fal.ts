import * as fal from '@fal-ai/serverless-client';
import type { ImagePrompt, ImageResult } from './types.js';
import { IntegrationError, IntegrationErrorCode } from '../common/errors.js';

type FalImage = { url: string };
type FalResult = { images: FalImage[] };

export class FalProvider {
  constructor(apiKey?: string) {
    fal.config({ credentials: apiKey ?? process.env.FAL_API_KEY });
  }

  async generateImage(prompt: ImagePrompt): Promise<ImageResult> {
    try {
      const result = await fal.subscribe<FalResult>('fal-ai/flux-pro/v1.1', {
        input: {
          prompt: prompt.prompt,
          image_size: prompt.imageSize ?? 'square_hd',
          num_images: prompt.numImages ?? 1,
        },
      });

      return {
        imageUrls: result.images.map((img) => img.url),
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): IntegrationError {
    const message = error instanceof Error ? error.message : 'Unknown fal.ai error';

    if (message.includes('authentication') || message.includes('unauthorized')) {
      return new IntegrationError({
        provider: 'fal',
        code: IntegrationErrorCode.AUTH_EXPIRED,
        message,
        providerError: error,
      });
    }
    if (message.includes('rate') || message.includes('throttl')) {
      return new IntegrationError({
        provider: 'fal',
        code: IntegrationErrorCode.RATE_LIMITED,
        message,
        providerError: error,
      });
    }
    return new IntegrationError({
      provider: 'fal',
      code: IntegrationErrorCode.PROVIDER_ERROR,
      message,
      providerError: error,
    });
  }
}
