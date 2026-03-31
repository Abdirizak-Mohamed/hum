// Common
export { IntegrationError, IntegrationErrorCode } from './common/errors.js';
export { withRetry } from './common/retry.js';

// AI
export { createAiClient } from './ai/index.js';
export type { AiClient, CopyPrompt, CopyResult, BrandInput, BrandProfileResult, ImagePrompt, ImageResult } from './ai/index.js';

// Social
export { createSocialClient, createSocialConnectClient } from './social/index.js';
export type { SocialClient, SocialConnectClient, SchedulePostInput, ScheduledPost, SocialProfile } from './social/index.js';

// Payments
export { createPaymentsClient } from './payments/index.js';
export type {
  PaymentsClient,
  CreateCustomerInput,
  Customer,
  CreateSubscriptionInput,
  Subscription,
  BillingPortalSession,
  WebhookEvent,
} from './payments/index.js';
