import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { BillingProvider } from './billing-provider';
import { BillingProviderRouter } from './billing-provider-router.service';
import { MercadoPagoBillingProvider } from './mercado-pago-billing-provider.service';
import { StubBillingProvider } from './stub-billing-provider.service';
import { StripeBillingProvider } from './stripe-billing-provider.service';

@Module({
  providers: [
    PlansService,
    StubBillingProvider,
    StripeBillingProvider,
    MercadoPagoBillingProvider,
    BillingProviderRouter,
    { provide: BillingProvider, useExisting: StubBillingProvider },
  ],
  controllers: [PlansController],
  exports: [PlansService],
})
export class PlansModule {}
