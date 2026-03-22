import { describe, it, expect } from 'vitest';
import { createPaymentsClient } from '../index.js';

describe('createPaymentsClient', () => {
  it('returns mock client when mock=true', async () => {
    const client = createPaymentsClient({ mock: true });

    const customer = await client.createCustomer({
      email: 'test@test.com',
      name: 'Test',
    });
    expect(customer.id).toEqual(expect.any(String));
    expect(customer.email).toBe('test@test.com');

    const sub = await client.createSubscription({
      customerId: customer.id,
      priceId: 'price_test',
    });
    expect(sub.status).toBe('active');

    const session = await client.createBillingPortalSession(customer.id);
    expect(session.url).toMatch(/^https?:\/\//);

    await expect(client.cancelSubscription(sub.id)).resolves.toBeUndefined();

    const event = client.constructWebhookEvent('{}', 'sig');
    expect(event.type).toEqual(expect.any(String));
  });
});
