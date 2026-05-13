import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { env } from '../shared/env';
import {
  BillingProvider,
  CreateCheckoutSessionInput,
  CreateCheckoutSessionResult,
} from './billing-provider';

@Injectable()
export class StubBillingProvider extends BillingProvider {
  readonly name = 'stub' as const;
  readonly capabilities = {
    name: this.name,
    implemented: true,
    supportsSubscriptions: true,
    supportsCustomerPortal: false,
    supportsHostedCheckout: true,
    supportsWebhookVerification: true,
    supportedCountries: ['*'],
    supportedCurrencies: ['*'],
  };

  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CreateCheckoutSessionResult> {
    const checkoutSessionId = `stub_${randomUUID()}`;
    const checkoutUrl = new URL(
      '/billing/stub/checkout',
      env.BILLING_APP_BASE_URL,
    );
    checkoutUrl.searchParams.set('session_id', checkoutSessionId);
    checkoutUrl.searchParams.set('tenant_id', input.tenantId);
    checkoutUrl.searchParams.set('plan', input.planCode);
    checkoutUrl.searchParams.set('success_url', input.successUrl);
    checkoutUrl.searchParams.set('cancel_url', input.cancelUrl);

    return {
      provider: 'stub',
      checkoutSessionId,
      checkoutUrl: checkoutUrl.toString(),
    };
  }
}
