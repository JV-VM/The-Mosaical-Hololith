import { BadRequestException } from '@nestjs/common';
import { env } from '../shared/env';
import { StripeBillingProvider } from './stripe-billing-provider.service';

const originalFetch = global.fetch;

jest.mock('../shared/env', () => ({
  env: {
    STRIPE_SECRET_KEY: 'sk_test_123',
    STRIPE_PRICE_MAP: { pro: 'price_pro' },
  },
}));

describe('StripeBillingProvider', () => {
  beforeEach(() => {
    env.STRIPE_SECRET_KEY = 'sk_test_123';
    env.STRIPE_PRICE_MAP = { pro: 'price_pro' };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('creates a subscription checkout session', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/pay/cs_test_123',
      }),
    });
    const provider = new StripeBillingProvider();

    const result = await provider.createCheckoutSession({
      tenantId: 'tenant-1',
      planCode: 'pro',
      planName: 'Pro',
      customerEmail: 'owner@example.com',
      successUrl: 'https://app.example.com/success',
      cancelUrl: 'https://app.example.com/cancel',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.stripe.com/v1/checkout/sessions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk_test_123',
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      }),
    );
    expect(result).toEqual({
      provider: 'stripe',
      checkoutSessionId: 'cs_test_123',
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_123',
    });
  });

  it('throws when the plan has no Stripe price configured', async () => {
    const provider = new StripeBillingProvider();

    await expect(
      provider.createCheckoutSession({
        tenantId: 'tenant-1',
        planCode: 'starter',
        planName: 'Starter',
        customerEmail: 'owner@example.com',
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
