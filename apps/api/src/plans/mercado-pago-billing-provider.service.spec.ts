import { BadRequestException } from '@nestjs/common';
import { env } from '../shared/env';
import { MercadoPagoBillingProvider } from './mercado-pago-billing-provider.service';

const originalFetch = global.fetch;

jest.mock('../shared/env', () => ({
  env: {
    MERCADO_PAGO_ACCESS_TOKEN: 'TEST-123',
    MERCADO_PAGO_PREAPPROVAL_PLAN_MAP: { pro: 'mp-plan-pro' },
  },
}));

describe('MercadoPagoBillingProvider', () => {
  beforeEach(() => {
    env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-123';
    env.MERCADO_PAGO_PREAPPROVAL_PLAN_MAP = { pro: 'mp-plan-pro' };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('creates a Mercado Pago preapproval checkout', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'mp-preapproval-1',
        init_point:
          'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=mp-preapproval-1',
      }),
    });
    const provider = new MercadoPagoBillingProvider();

    const result = await provider.createCheckoutSession({
      tenantId: 'tenant-1',
      planCode: 'pro',
      planName: 'Pro',
      customerEmail: 'owner@example.com',
      billingCountry: 'BR',
      currency: 'BRL',
      successUrl: 'https://app.example.com/success',
      cancelUrl: 'https://app.example.com/cancel',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.mercadopago.com/preapproval',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer TEST-123',
          'Content-Type': 'application/json',
        }),
      }),
    );
    expect(result).toEqual({
      provider: 'mercado_pago',
      checkoutSessionId: 'mp-preapproval-1',
      checkoutUrl:
        'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=mp-preapproval-1',
    });
  });

  it('throws when the plan has no Mercado Pago preapproval plan configured', async () => {
    const provider = new MercadoPagoBillingProvider();

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
