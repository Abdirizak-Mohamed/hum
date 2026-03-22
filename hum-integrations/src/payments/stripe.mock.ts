import type {
  PaymentsClient,
  CreateCustomerInput,
  Customer,
  CreateSubscriptionInput,
  Subscription,
  BillingPortalSession,
  WebhookEvent,
} from './types.js';

export class MockStripeProvider implements PaymentsClient {
  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    return {
      id: `mock-cus-${Date.now()}`,
      email: input.email,
      name: input.name,
    };
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<Subscription> {
    return {
      id: `mock-sub-${Date.now()}`,
      customerId: input.customerId,
      status: 'active',
      currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    };
  }

  async cancelSubscription(_subscriptionId: string): Promise<void> {
    // no-op
  }

  async createBillingPortalSession(_customerId: string): Promise<BillingPortalSession> {
    return { url: 'https://billing.stripe.com/mock-session' };
  }

  constructWebhookEvent(_payload: string, _signature: string): WebhookEvent {
    return {
      type: 'customer.subscription.created',
      data: { object: { id: 'mock-sub', status: 'active' } },
    };
  }
}
