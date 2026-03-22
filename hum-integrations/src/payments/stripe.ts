import Stripe from 'stripe';
import type {
  PaymentsClient,
  CreateCustomerInput,
  Customer,
  CreateSubscriptionInput,
  Subscription,
  BillingPortalSession,
  WebhookEvent,
} from './types.js';
import { IntegrationError, IntegrationErrorCode } from '../common/errors.js';

export class StripeProvider implements PaymentsClient {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(config?: { secretKey?: string; webhookSecret?: string }) {
    this.stripe = new Stripe(config?.secretKey ?? process.env.STRIPE_SECRET_KEY ?? '', {
      apiVersion: '2025-02-24.acacia',
    });
    this.webhookSecret = config?.webhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET ?? '';
  }

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email: input.email,
        name: input.name,
        metadata: input.metadata,
      });

      return {
        id: customer.id,
        email: customer.email ?? input.email,
        name: customer.name ?? input.name,
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<Subscription> {
    try {
      const sub = await this.stripe.subscriptions.create({
        customer: input.customerId,
        items: [{ price: input.priceId }],
        metadata: input.metadata,
      });

      return {
        id: sub.id,
        customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
        status: sub.status,
        currentPeriodEnd: sub.current_period_end,
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async createBillingPortalSession(customerId: string): Promise<BillingPortalSession> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
      });

      return { url: session.url };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  constructWebhookEvent(payload: string, signature: string): WebhookEvent {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );

      return {
        type: event.type,
        data: event.data.object as unknown as Record<string, unknown>,
      };
    } catch (error) {
      throw new IntegrationError({
        provider: 'stripe',
        code: IntegrationErrorCode.INVALID_INPUT,
        message: error instanceof Error ? error.message : 'Invalid webhook signature',
        providerError: error,
      });
    }
  }

  private mapError(error: unknown): IntegrationError {
    if (error instanceof Stripe.errors.StripeAuthenticationError) {
      return new IntegrationError({
        provider: 'stripe',
        code: IntegrationErrorCode.AUTH_EXPIRED,
        message: error.message,
        providerError: error,
      });
    }
    if (error instanceof Stripe.errors.StripeRateLimitError) {
      return new IntegrationError({
        provider: 'stripe',
        code: IntegrationErrorCode.RATE_LIMITED,
        message: error.message,
        providerError: error,
      });
    }
    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      if (error.statusCode === 404) {
        return new IntegrationError({
          provider: 'stripe',
          code: IntegrationErrorCode.NOT_FOUND,
          message: error.message,
          providerError: error,
        });
      }
      return new IntegrationError({
        provider: 'stripe',
        code: IntegrationErrorCode.INVALID_INPUT,
        message: error.message,
        providerError: error,
      });
    }
    if (error instanceof Stripe.errors.StripeConnectionError) {
      return new IntegrationError({
        provider: 'stripe',
        code: IntegrationErrorCode.NETWORK_ERROR,
        message: error.message,
        providerError: error,
      });
    }
    return new IntegrationError({
      provider: 'stripe',
      code: IntegrationErrorCode.PROVIDER_ERROR,
      message: error instanceof Error ? error.message : 'Unknown Stripe error',
      providerError: error,
    });
  }
}
