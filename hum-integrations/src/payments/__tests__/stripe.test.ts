import { describe, it, expect } from 'vitest';
import { MockStripeProvider } from '../stripe.mock.js';

describe('MockStripeProvider', () => {
  const provider = new MockStripeProvider();

  it('createCustomer returns a customer', async () => {
    const customer = await provider.createCustomer({
      email: 'ali@kebabs.com',
      name: "Ali's Kebabs",
    });

    expect(customer.id).toEqual(expect.any(String));
    expect(customer.email).toBe('ali@kebabs.com');
    expect(customer.name).toBe("Ali's Kebabs");
  });

  it('createSubscription returns a subscription', async () => {
    const sub = await provider.createSubscription({
      customerId: 'cus_123',
      priceId: 'price_growth',
    });

    expect(sub.id).toEqual(expect.any(String));
    expect(sub.customerId).toBe('cus_123');
    expect(sub.status).toBe('active');
    expect(sub.currentPeriodEnd).toEqual(expect.any(Number));
  });

  it('cancelSubscription resolves without error', async () => {
    await expect(provider.cancelSubscription('sub_123')).resolves.toBeUndefined();
  });

  it('createBillingPortalSession returns a URL', async () => {
    const session = await provider.createBillingPortalSession('cus_123');
    expect(session.url).toMatch(/^https?:\/\//);
  });

  it('constructWebhookEvent returns an event', () => {
    const event = provider.constructWebhookEvent('{}', 'sig');
    expect(event.type).toEqual(expect.any(String));
    expect(event.data).toEqual(expect.any(Object));
  });
});
