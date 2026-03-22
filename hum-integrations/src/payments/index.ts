import type { PaymentsClient } from './types.js';
import { StripeProvider } from './stripe.js';
import { MockStripeProvider } from './stripe.mock.js';

export type {
  PaymentsClient,
  CreateCustomerInput,
  Customer,
  CreateSubscriptionInput,
  Subscription,
  BillingPortalSession,
  WebhookEvent,
} from './types.js';

export function createPaymentsClient(config?: {
  mock?: boolean;
  secretKey?: string;
  webhookSecret?: string;
}): PaymentsClient {
  const useMock = config?.mock ?? process.env.HUM_MOCK_INTEGRATIONS === 'true';

  if (useMock) {
    return new MockStripeProvider();
  }

  return new StripeProvider({
    secretKey: config?.secretKey,
    webhookSecret: config?.webhookSecret,
  });
}
