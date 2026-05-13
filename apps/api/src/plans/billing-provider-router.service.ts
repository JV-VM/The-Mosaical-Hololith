import { BadRequestException, Injectable } from '@nestjs/common';
import { env } from '../shared/env';
import {
  BillingProvider,
  BillingProviderCapabilities,
  BillingProviderName,
} from './billing-provider';
import { MercadoPagoBillingProvider } from './mercado-pago-billing-provider.service';
import { StubBillingProvider } from './stub-billing-provider.service';
import { StripeBillingProvider } from './stripe-billing-provider.service';

type SelectBillingProviderInput = {
  preferredProvider?: BillingProviderName;
  billingCountry?: string;
  currency?: string;
};

const plannedProviderCapabilities: BillingProviderCapabilities[] = [
  {
    name: 'payoneer',
    implemented: false,
    supportsSubscriptions: false,
    supportsCustomerPortal: false,
    supportsHostedCheckout: true,
    supportsWebhookVerification: true,
    supportedCountries: ['*'],
    supportedCurrencies: ['USD', 'EUR', 'GBP'],
  },
];

@Injectable()
export class BillingProviderRouter {
  constructor(
    private readonly stubProvider: StubBillingProvider,
    private readonly stripeProvider: StripeBillingProvider,
    private readonly mercadoPagoProvider: MercadoPagoBillingProvider,
  ) {}

  listCapabilities(): BillingProviderCapabilities[] {
    return [
      this.stubProvider.capabilities,
      this.stripeProvider.capabilities,
      ...plannedProviderCapabilities,
      this.mercadoPagoProvider.capabilities,
    ];
  }

  selectProvider(input: SelectBillingProviderInput): BillingProvider {
    const target =
      input.preferredProvider ?? this.resolveConfiguredProvider(input);
    if (target === 'stub') {
      return this.stubProvider;
    }

    if (target === 'stripe') {
      return this.stripeProvider;
    }

    if (target === 'mercado_pago') {
      return this.mercadoPagoProvider;
    }

    throw new BadRequestException(
      `Billing provider is not implemented yet: ${target}`,
    );
  }

  private resolveConfiguredProvider(input: SelectBillingProviderInput) {
    if (this.isLocalBillingEnabled()) {
      return env.BILLING_LOCAL_PROVIDER;
    }

    if (this.isNationalBilling(input)) {
      return env.BILLING_NATIONAL_PROVIDER;
    }

    return env.BILLING_DEFAULT_PROVIDER;
  }

  private isLocalBillingEnabled() {
    return (
      env.BILLING_PROVIDER === 'stub' && env.BILLING_DEFAULT_PROVIDER === 'stub'
    );
  }

  private isNationalBilling(input: SelectBillingProviderInput) {
    const country = input.billingCountry?.trim().toUpperCase();
    const currency = input.currency?.trim().toUpperCase();

    return (
      (country !== undefined &&
        env.BILLING_NATIONAL_COUNTRIES.includes(country)) ||
      (currency !== undefined &&
        env.BILLING_NATIONAL_CURRENCIES.includes(currency))
    );
  }
}
