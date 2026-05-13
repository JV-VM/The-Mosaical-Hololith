import { BadRequestException, Injectable } from '@nestjs/common';
import { env } from '../shared/env';
import {
  BillingProvider,
  CreateCheckoutSessionInput,
  CreateCheckoutSessionResult,
} from './billing-provider';

type StripeCheckoutSessionResponse = {
  id?: string;
  url?: string;
  error?: { message?: string };
};

@Injectable()
export class StripeBillingProvider extends BillingProvider {
  readonly name = 'stripe' as const;
  readonly capabilities = {
    name: this.name,
    implemented: true,
    supportsSubscriptions: true,
    supportsCustomerPortal: true,
    supportsHostedCheckout: true,
    supportsWebhookVerification: true,
    supportedCountries: ['*'],
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
  };

  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CreateCheckoutSessionResult> {
    const secretKey = env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new BadRequestException('Stripe secret key is not configured');
    }

    const priceId = env.STRIPE_PRICE_MAP[input.planCode];
    if (!priceId) {
      throw new BadRequestException(
        `Stripe price is not configured for plan: ${input.planCode}`,
      );
    }

    const body = new URLSearchParams();
    body.set('mode', 'subscription');
    body.set('customer_email', input.customerEmail);
    body.set('line_items[0][price]', priceId);
    body.set('line_items[0][quantity]', '1');
    body.set('success_url', input.successUrl);
    body.set('cancel_url', input.cancelUrl);
    body.set('metadata[tenantId]', input.tenantId);
    body.set('metadata[planCode]', input.planCode);
    body.set('subscription_data[metadata][tenantId]', input.tenantId);
    body.set('subscription_data[metadata][planCode]', input.planCode);

    const response = await fetch(
      'https://api.stripe.com/v1/checkout/sessions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );

    const payload = (await response.json()) as StripeCheckoutSessionResponse;
    if (!response.ok || !payload.id || !payload.url) {
      throw new BadRequestException(
        payload.error?.message ?? 'Stripe checkout session creation failed',
      );
    }

    return {
      provider: this.name,
      checkoutSessionId: payload.id,
      checkoutUrl: payload.url,
    };
  }
}
