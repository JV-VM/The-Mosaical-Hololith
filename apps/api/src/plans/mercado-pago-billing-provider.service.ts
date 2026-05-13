import { BadRequestException, Injectable } from '@nestjs/common';
import { env } from '../shared/env';
import {
  BillingProvider,
  CreateCheckoutSessionInput,
  CreateCheckoutSessionResult,
} from './billing-provider';

type MercadoPagoPreapprovalResponse = {
  id?: string;
  init_point?: string;
  message?: string;
};

@Injectable()
export class MercadoPagoBillingProvider extends BillingProvider {
  readonly name = 'mercado_pago' as const;
  readonly capabilities = {
    name: this.name,
    implemented: true,
    supportsSubscriptions: true,
    supportsCustomerPortal: false,
    supportsHostedCheckout: true,
    supportsWebhookVerification: true,
    supportedCountries: ['BR'],
    supportedCurrencies: ['BRL'],
  };

  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CreateCheckoutSessionResult> {
    const accessToken = env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new BadRequestException(
        'Mercado Pago access token is not configured',
      );
    }

    const preapprovalPlanId =
      env.MERCADO_PAGO_PREAPPROVAL_PLAN_MAP[input.planCode];
    if (!preapprovalPlanId) {
      throw new BadRequestException(
        `Mercado Pago preapproval plan is not configured for plan: ${input.planCode}`,
      );
    }

    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        preapproval_plan_id: preapprovalPlanId,
        payer_email: input.customerEmail,
        back_url: input.successUrl,
        external_reference: `${input.tenantId}:${input.planCode}`,
        reason: input.planName,
      }),
    });

    const payload = (await response.json()) as MercadoPagoPreapprovalResponse;
    if (!response.ok || !payload.id || !payload.init_point) {
      throw new BadRequestException(
        payload.message ?? 'Mercado Pago subscription creation failed',
      );
    }

    return {
      provider: this.name,
      checkoutSessionId: payload.id,
      checkoutUrl: payload.init_point,
    };
  }
}
