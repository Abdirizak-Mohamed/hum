import OpenAI from 'openai';
import type { CopyPrompt, CopyResult, BrandInput, BrandProfileResult } from './types.js';
import { IntegrationError, IntegrationErrorCode } from '../common/errors.js';

export class OpenAiProvider {
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY });
  }

  async generateCopy(prompt: CopyPrompt): Promise<CopyResult> {
    try {
      const response = await this.client.chat.completions.create({
        model: prompt.model ?? 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt.systemPrompt },
          { role: 'user', content: prompt.userPrompt },
        ],
        max_tokens: prompt.maxTokens,
      });

      const text = response.choices[0]?.message?.content ?? '';
      return {
        text,
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
        },
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async generateBrandProfile(input: BrandInput): Promise<BrandProfileResult> {
    const systemPrompt = `You are a brand strategist specialising in restaurant and takeaway marketing. Generate a brand profile as JSON with these exact fields: brandVoiceGuide (string), keySellingPoints (string[]), targetAudienceProfile (string), contentThemes (string[]), hashtagStrategy (string[]), peakPostingTimes (object mapping platform names like "instagram", "facebook", "tiktok", "google_business" to arrays of time strings like ["12:00", "18:00", "21:00"]). Return only valid JSON, no markdown.`;

    const userPrompt = [
      `Business: ${input.businessName}`,
      `Menu: ${input.menuDescription}`,
      input.cuisineType ? `Cuisine: ${input.cuisineType}` : '',
      input.location ? `Location: ${input.location}` : '',
      input.brandPreferences ? `Brand preferences: ${input.brandPreferences}` : '',
    ].filter(Boolean).join('\n');

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content ?? '{}';
      return JSON.parse(content) as BrandProfileResult;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): IntegrationError {
    if (error instanceof OpenAI.AuthenticationError) {
      return new IntegrationError({
        provider: 'openai',
        code: IntegrationErrorCode.AUTH_EXPIRED,
        message: error.message,
        providerError: error,
      });
    }
    if (error instanceof OpenAI.RateLimitError) {
      return new IntegrationError({
        provider: 'openai',
        code: IntegrationErrorCode.RATE_LIMITED,
        message: error.message,
        providerError: error,
      });
    }
    if (error instanceof OpenAI.BadRequestError) {
      return new IntegrationError({
        provider: 'openai',
        code: IntegrationErrorCode.INVALID_INPUT,
        message: error.message,
        providerError: error,
      });
    }
    if (error instanceof OpenAI.APIConnectionError) {
      return new IntegrationError({
        provider: 'openai',
        code: IntegrationErrorCode.NETWORK_ERROR,
        message: error.message,
        providerError: error,
      });
    }
    return new IntegrationError({
      provider: 'openai',
      code: IntegrationErrorCode.PROVIDER_ERROR,
      message: error instanceof Error ? error.message : 'Unknown OpenAI error',
      providerError: error,
    });
  }
}
