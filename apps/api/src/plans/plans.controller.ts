import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsISO8601, IsIn, IsOptional, IsString } from 'class-validator';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user';
import { CurrentTenant } from '../tenants/decorators/current-tenant.decorator';
import { TenantAdminGuard } from '../tenants/guards/tenant-admin.guard';
import { TenantMemberGuard } from '../tenants/guards/tenant-member.guard';
import { PlansService } from './plans.service';

class UpgradeDto {
  @IsIn(['free', 'starter', 'pro', 'business'])
  planCode!: 'free' | 'starter' | 'pro' | 'business';
}

class CheckoutDto {
  @IsIn(['starter', 'pro', 'business'])
  planCode!: 'starter' | 'pro' | 'business';

  @IsOptional()
  @IsIn(['stub', 'stripe', 'payoneer', 'mercado_pago'])
  preferredProvider?: 'stub' | 'stripe' | 'payoneer' | 'mercado_pago';

  @IsOptional()
  @IsString()
  billingCountry?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}

class StubBillingWebhookDto {
  @IsString()
  eventId!: string;

  @IsIn([
    'checkout.completed',
    'subscription.past_due',
    'subscription.canceled',
  ])
  type!:
    | 'checkout.completed'
    | 'subscription.past_due'
    | 'subscription.canceled';

  @IsOptional()
  @IsString()
  checkoutSessionId?: string;

  @IsOptional()
  @IsString()
  providerSubscriptionId?: string;

  @IsOptional()
  @IsISO8601()
  currentPeriodEnd?: string;
}

@Controller()
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Get('billing/plan')
  async currentPlan(@CurrentTenant() tenantId: string) {
    const info = await this.plans.getTenantPlan(tenantId);
    const usage = await this.plans.computeUsage(tenantId, info.plan.quotas);
    return { ...info, usage };
  }

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Get('billing/plans')
  async availablePlans() {
    return this.plans.listAvailablePlans();
  }

  @UseGuards(JwtAuthGuard, TenantMemberGuard)
  @Get('billing/providers')
  async billingProviders() {
    return this.plans.listBillingProviders();
  }

  @UseGuards(JwtAuthGuard, TenantMemberGuard, TenantAdminGuard)
  @Post('billing/checkout')
  async checkout(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CheckoutDto,
  ) {
    return this.plans.createCheckoutSession({
      tenantId,
      planCode: dto.planCode,
      customerEmail: user.email,
      preferredProvider: dto.preferredProvider,
      billingCountry: dto.billingCountry,
      currency: dto.currency,
    });
  }

  // Transitional path. Provider-backed checkout replaces this.
  @UseGuards(JwtAuthGuard, TenantMemberGuard, TenantAdminGuard)
  @Post('billing/upgrade')
  async upgrade(@CurrentTenant() tenantId: string, @Body() dto: UpgradeDto) {
    const sub = await this.plans.setTenantPlan(tenantId, dto.planCode);
    return {
      subscription: { id: sub.id, status: sub.status },
      plan: {
        code: sub.plan.code,
        name: sub.plan.name,
        quotas: sub.plan.quotas,
        features: sub.plan.features ?? {},
      },
    };
  }

  @Post('billing/webhooks/stub')
  async stubWebhook(
    @Headers('x-billing-webhook-secret') secret: string | undefined,
    @Body() dto: StubBillingWebhookDto,
  ) {
    return this.plans.processStubBillingWebhook({
      secret,
      event: dto,
    });
  }
}
