import type { SocialClient, SchedulePostInput, ScheduledPost, SocialProfile } from './types.js';
import { IntegrationError, IntegrationErrorCode } from '../common/errors.js';
import { withRetry } from '../common/retry.js';
import type { Platform } from 'hum-core';

const AYRSHARE_BASE = 'https://app.ayrshare.com/api';

type AyrshareConfig = {
  apiKey?: string;
  retryBaseDelayMs?: number;
};

export class AyrshareProvider implements SocialClient {
  private apiKey: string;
  private retryBaseDelayMs: number;

  constructor(config?: AyrshareConfig) {
    this.apiKey = config?.apiKey ?? process.env.AYRSHARE_API_KEY ?? '';
    this.retryBaseDelayMs = config?.retryBaseDelayMs ?? 1000;
  }

  async schedulePost(input: SchedulePostInput): Promise<ScheduledPost> {
    const body: Record<string, unknown> = {
      post: input.post,
      platforms: input.platforms,
      profileKey: input.profileKey,
    };
    if (input.mediaUrls?.length) body.mediaUrls = input.mediaUrls;
    if (input.scheduledDate) body.scheduleDate = input.scheduledDate;
    if (input.hashtags?.length) {
      body.post = `${input.post}\n\n${input.hashtags.join(' ')}`;
    }

    const data = await this.request<AyrsharePostResponse>('POST', '/post', body);

    const postIds: Partial<Record<Platform, string>> = {};
    if (data.postIds) {
      for (const [platform, id] of Object.entries(data.postIds)) {
        postIds[platform as Platform] = String(id);
      }
    }

    return {
      id: data.id,
      status: data.status ?? 'scheduled',
      postIds,
    };
  }

  async getProfiles(): Promise<SocialProfile[]> {
    const data = await this.request<AyrshareProfilesResponse>('GET', '/profiles');

    return (data.profiles ?? []).map((p) => ({
      profileKey: p.profileKey ?? '',
      activePlatforms: (p.activeSocialAccounts ?? []) as Platform[],
    }));
  }

  async deletePost(postId: string): Promise<void> {
    await this.request('DELETE', `/post/${postId}`);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    return withRetry(
      async () => {
        let response: Response;
        try {
          response = await fetch(`${AYRSHARE_BASE}${path}`, {
            method,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: body ? JSON.stringify(body) : undefined,
          });
        } catch (error) {
          throw new IntegrationError({
            provider: 'ayrshare',
            code: IntegrationErrorCode.NETWORK_ERROR,
            message: error instanceof Error ? error.message : 'Network error',
            providerError: error,
          });
        }

        if (!response.ok) {
          let bodyText: string;
          try {
            bodyText = await response.clone().text();
          } catch {
            bodyText = '';
          }
          throw this.mapHttpError(response.status, bodyText);
        }

        return (await response.json()) as T;
      },
      {
        maxRetries: 2,
        baseDelayMs: this.retryBaseDelayMs,
        shouldRetry: (error) =>
          error instanceof IntegrationError && error.retryable,
      },
    );
  }

  private mapHttpError(status: number, body: string): IntegrationError {
    if (status === 401 || status === 403) {
      return new IntegrationError({
        provider: 'ayrshare',
        code: IntegrationErrorCode.AUTH_EXPIRED,
        message: `Ayrshare auth error (${status}): ${body}`,
      });
    }
    if (status === 404) {
      return new IntegrationError({
        provider: 'ayrshare',
        code: IntegrationErrorCode.NOT_FOUND,
        message: `Ayrshare not found (${status}): ${body}`,
      });
    }
    if (status === 429) {
      return new IntegrationError({
        provider: 'ayrshare',
        code: IntegrationErrorCode.RATE_LIMITED,
        message: `Ayrshare rate limited: ${body}`,
      });
    }
    return new IntegrationError({
      provider: 'ayrshare',
      code: IntegrationErrorCode.PROVIDER_ERROR,
      message: `Ayrshare error (${status}): ${body}`,
    });
  }
}

type AyrsharePostResponse = {
  id: string;
  status?: string;
  postIds?: Record<string, string>;
};

type AyrshareProfilesResponse = {
  profiles?: Array<{
    profileKey?: string;
    activeSocialAccounts?: string[];
  }>;
};
