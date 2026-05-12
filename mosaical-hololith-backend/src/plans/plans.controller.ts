import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../tenants/decorators/current-tenant.decorator';
import { TenantAdminGuard } from '../tenants/guards/tenant-admin.guard';
import { TenantMemberGuard } from '../tenants/guards/tenant-member.guard';
import { PlansService } from './plans.service';

class UpgradeDto {
  planCode!: 'free' | 'starter' | 'pro' | 'business';
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

  // MVP: upgrades without payments. Lock this behind Stripe later.
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
}
