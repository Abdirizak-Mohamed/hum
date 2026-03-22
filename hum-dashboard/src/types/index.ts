import type { Client, BrandProfile, SocialAccount, ContentItem } from 'hum-core';

export type { Client, BrandProfile, SocialAccount, ContentItem };

// ─── Client Status ────────────────────────────────────────────────────────────

export type ClientStatus = 'active' | 'onboarding' | 'paused' | 'churned';

// ─── Fleet Stats ──────────────────────────────────────────────────────────────

export type HealthIndicator = {
  status: 'green' | 'amber' | 'red';
  detail: string;
};

export type FleetStats = {
  total: number;
  active: number;
  issues: number;
  onboarding: number;
  paused: number;
  health: {
    contentPipeline: HealthIndicator;
    socialConnections: HealthIndicator;
    tokenStatus: HealthIndicator;
    contentGeneration: HealthIndicator;
  };
  upcomingContent: ContentSummary[];
  recentIssues: IssueItem[];
};

// ─── Content Summary ──────────────────────────────────────────────────────────

export type ContentSummary = {
  id: string;
  clientId: string;
  clientName: string;
  contentType: string;
  platform: string;
  scheduledAt: string;
  mediaUrl: string | null;
};

// ─── Issue Item ───────────────────────────────────────────────────────────────

export type IssueItem = {
  id: string;
  type: 'token_expired' | 'failed_post' | 'gen_error';
  severity: 'red' | 'amber' | 'purple';
  clientId: string;
  clientName: string;
  description: string;
  timestamp: string;
  entityType: 'content_item' | 'social_account';
  entityId: string;
};

// ─── Client Detail ────────────────────────────────────────────────────────────

export type ClientDetail = {
  client: Client;
  brandProfile: BrandProfile | null;
  socialAccounts: SocialAccount[];
  recentContent: ContentItem[];
  onboarding: OnboardingStatus | null;
};

// ─── Onboarding Status ────────────────────────────────────────────────────────

export type OnboardingStatus = {
  sessionId: string;
  status: string;
  currentStep: string;
  steps: Array<{
    name: string;
    status: 'complete' | 'processing' | 'pending' | 'failed';
  }>;
};

// ─── Client List Item ─────────────────────────────────────────────────────────

export type ClientListItem = {
  id: string;
  businessName: string;
  email: string;
  address: string | null;
  planTier: string;
  status: ClientStatus;
  platforms: Array<{
    platform: string;
    status: string;
  }>;
  scheduledCount: number;
};

// ─── API Error ────────────────────────────────────────────────────────────────

export type ApiError = {
  error: string;
  code: string;
};
