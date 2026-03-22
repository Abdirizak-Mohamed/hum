export type CreateCustomerInput = {
  email: string;
  name: string;
  metadata?: Record<string, string>;
};

export type Customer = {
  id: string;
  email: string;
  name: string;
};

export type CreateSubscriptionInput = {
  customerId: string;
  priceId: string;
  metadata?: Record<string, string>;
};

export type Subscription = {
  id: string;
  customerId: string;
  status: string;
  currentPeriodEnd: number;
};

export type BillingPortalSession = {
  url: string;
};

export type WebhookEvent = {
  type: string;
  data: Record<string, unknown>;
};

export interface PaymentsClient {
  createCustomer(input: CreateCustomerInput): Promise<Customer>;
  createSubscription(input: CreateSubscriptionInput): Promise<Subscription>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  createBillingPortalSession(customerId: string): Promise<BillingPortalSession>;
  constructWebhookEvent(payload: string, signature: string): WebhookEvent;
}
