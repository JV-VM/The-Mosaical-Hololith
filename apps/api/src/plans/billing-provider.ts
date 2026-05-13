export type BillingProviderName =
  | 'stub'
  | 'stripe'
  | 'payoneer'
  | 'mercado_pago';

export type BillingProviderCapabilities = {
  name: BillingProviderName;
  implemented: boolean;
  supportsSubscriptions: boolean;
  supportsCustomerPortal: boolean;
  supportsHostedCheckout: boolean;
  supportsWebhookVerification: boolean;
  supportedCountries: string[];
  supportedCurrencies: string[];
};

export type CreateCheckoutSessionInput = {
  tenantId: string;
  planCode: string;
  planName: string;
  customerEmail: string;
  billingCountry?: string;
  currency?: string;
  successUrl: string;
  cancelUrl: string;
};

export type CreateCheckoutSessionResult = {
  provider: BillingProviderName;
  checkoutSessionId: string;
  checkoutUrl: string;
};

export abstract class BillingProvider {
  abstract readonly name: BillingProviderName;
  abstract readonly capabilities: BillingProviderCapabilities;

  abstract createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CreateCheckoutSessionResult>;
}
