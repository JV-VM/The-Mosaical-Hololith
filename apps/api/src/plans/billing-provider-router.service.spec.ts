import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BillingProviderRouter } from './billing-provider-router.service';
import { MercadoPagoBillingProvider } from './mercado-pago-billing-provider.service';
import { StubBillingProvider } from './stub-billing-provider.service';
import { StripeBillingProvider } from './stripe-billing-provider.service';

describe('BillingProviderRouter', () => {
  let router: BillingProviderRouter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingProviderRouter,
        StubBillingProvider,
        StripeBillingProvider,
        MercadoPagoBillingProvider,
      ],
    }).compile();

    router = module.get<BillingProviderRouter>(BillingProviderRouter);
  });

  it('lists implemented and planned provider capabilities', () => {
    const capabilities = router.listCapabilities();

    expect(capabilities.map((provider) => provider.name)).toEqual([
      'stub',
      'stripe',
      'payoneer',
      'mercado_pago',
    ]);
    expect(
      capabilities.find((provider) => provider.name === 'stub')?.implemented,
    ).toBe(true);
    expect(
      capabilities.find((provider) => provider.name === 'stripe')?.implemented,
    ).toBe(true);
    expect(
      capabilities.find((provider) => provider.name === 'mercado_pago')
        ?.supportedCurrencies,
    ).toContain('BRL');
  });

  it('uses the stub provider while local billing is enabled', () => {
    const provider = router.selectProvider({
      billingCountry: 'BR',
      currency: 'BRL',
    });

    expect(provider.name).toBe('stub');
  });

  it('returns implemented providers when they are explicitly selected', () => {
    expect(router.selectProvider({ preferredProvider: 'stripe' }).name).toBe(
      'stripe',
    );
    expect(
      router.selectProvider({ preferredProvider: 'mercado_pago' }).name,
    ).toBe('mercado_pago');
  });

  it('rejects Payoneer until its checkout-only adapter is implemented', () => {
    expect(() =>
      router.selectProvider({ preferredProvider: 'payoneer' }),
    ).toThrow(BadRequestException);
  });
});
