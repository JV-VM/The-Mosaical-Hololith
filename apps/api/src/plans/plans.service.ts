import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, SubscriptionStatus } from '@prisma/client';
import { env } from '../shared/env';
import { PrismaService } from '../shared/prisma/prisma.service';
import { BillingProviderName } from './billing-provider';
import { BillingProviderRouter } from './billing-provider-router.service';

export type Quotas = {
  maxStores: number; // per tenant
  maxProductsPerStore: number; // per store
  maxProductsTotal?: number; // optional per tenant
  maxTagTier: number; // 1=A, 2=B, 3=C
};

type PlanFeatures = Prisma.InputJsonValue;
type PlanRecord = {
  id: string;
  code: string;
  name: string;
  quotas: Prisma.JsonValue;
  features: Prisma.JsonValue | null;
};
type SubscriptionWithPlan = {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  provider: string;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  providerCheckoutSessionId: string | null;
  billingInterval: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  pendingPlanCode: string | null;
  lastProviderSyncAt: Date | null;
  plan: PlanRecord;
};
type StubBillingWebhookEvent = {
  eventId: string;
  type:
    | 'checkout.completed'
    | 'subscription.past_due'
    | 'subscription.canceled';
  checkoutSessionId?: string;
  providerSubscriptionId?: string;
  currentPeriodEnd?: string;
};

const DEFAULT_FREE_PLAN: {
  code: string;
  name: string;
  quotas: Quotas;
  features?: PlanFeatures;
} = {
  code: 'free',
  name: 'Free',
  quotas: {
    maxStores: 1,
    maxProductsPerStore: 10,
    maxProductsTotal: 10,
    maxTagTier: 1,
  },
  features: { customDomain: false, analyticsLevel: 1 },
};

@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingProviders: BillingProviderRouter,
  ) {}

  private formatLimitMessage(
    params:
      | { kind: 'maxStores'; value: number }
      | { kind: 'maxProductsPerStore'; value: number }
      | { kind: 'maxProductsTotal'; value: number }
      | { kind: 'maxTagTier'; tagTier: number; maxTagTier: number },
  ) {
    if (params.kind === 'maxStores') {
      return `Plan limit reached: maxStores=${params.value}. Upgrade required.`;
    }

    if (params.kind === 'maxProductsPerStore') {
      return `Plan limit reached: maxProductsPerStore=${params.value}. Upgrade required.`;
    }

    if (params.kind === 'maxProductsTotal') {
      return `Plan limit reached: maxProductsTotal=${params.value}. Upgrade required.`;
    }

    return `Tag tier not allowed by plan. tagTier=${params.tagTier}, maxTagTier=${params.maxTagTier}.`;
  }

  private async ensureFreePlan() {
    return this.prisma.plan.upsert({
      where: { code: DEFAULT_FREE_PLAN.code },
      update: {},
      create: {
        code: DEFAULT_FREE_PLAN.code,
        name: DEFAULT_FREE_PLAN.name,
        quotas: DEFAULT_FREE_PLAN.quotas,
        features: DEFAULT_FREE_PLAN.features,
      },
    });
  }

  private isSubscriptionEntitled(
    subscription: SubscriptionWithPlan,
    now = new Date(),
  ) {
    if (subscription.status === SubscriptionStatus.ACTIVE) {
      return true;
    }

    if (
      subscription.status === SubscriptionStatus.PAST_DUE ||
      subscription.status === SubscriptionStatus.CANCELING
    ) {
      return (
        subscription.currentPeriodEnd !== null &&
        subscription.currentPeriodEnd.getTime() > now.getTime()
      );
    }

    return false;
  }

  private mapPlan(plan: PlanRecord) {
    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      quotas: plan.quotas as Quotas,
      features: (plan.features as PlanFeatures) ?? {},
    };
  }

  private resolveEffectivePlan(params: {
    subscription: SubscriptionWithPlan;
    freePlan: PlanRecord;
    now?: Date;
  }) {
    const entitled = this.isSubscriptionEntitled(
      params.subscription,
      params.now,
    );
    const effectivePlan = entitled ? params.subscription.plan : params.freePlan;

    return {
      plan: effectivePlan,
      entitlement: {
        source: entitled ? 'subscription' : 'free_fallback',
        planCode: effectivePlan.code,
        expiresAt: entitled
          ? (params.subscription.currentPeriodEnd?.toISOString() ?? null)
          : null,
      },
    };
  }

  private async findOrCreateTenantSubscription(
    tenantId: string,
    freePlan: PlanRecord,
  ) {
    const sub = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });
    if (sub) return sub;

    return this.prisma.subscription.create({
      data: {
        tenantId,
        planId: freePlan.id,
        status: SubscriptionStatus.ACTIVE,
      },
      include: { plan: true },
    });
  }

  // Ensure Free plan exists + tenant has subscription
  async ensureTenantSubscription(tenantId: string) {
    const freePlan = (await this.ensureFreePlan()) as PlanRecord;
    return this.findOrCreateTenantSubscription(tenantId, freePlan);
  }

  async getTenantPlan(tenantId: string) {
    const freePlan = (await this.ensureFreePlan()) as PlanRecord;
    const sub = (await this.findOrCreateTenantSubscription(
      tenantId,
      freePlan,
    )) as SubscriptionWithPlan;

    if (!sub?.plan) {
      throw new BadRequestException('Subscription/plan missing');
    }

    const effective = this.resolveEffectivePlan({
      subscription: sub,
      freePlan,
    });

    return {
      subscription: {
        id: sub.id,
        status: sub.status,
        provider: sub.provider,
        providerCustomerId: sub.providerCustomerId,
        providerSubscriptionId: sub.providerSubscriptionId,
        providerCheckoutSessionId: sub.providerCheckoutSessionId,
        billingInterval: sub.billingInterval,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        canceledAt: sub.canceledAt,
        pendingPlanCode: sub.pendingPlanCode,
        lastProviderSyncAt: sub.lastProviderSyncAt,
        entitlement: effective.entitlement,
      },
      plan: this.mapPlan(effective.plan),
    };
  }

  async computeUsage(tenantId: string, quotas?: Quotas) {
    const [storeCount, productsTotal] = await Promise.all([
      this.prisma.store.count({ where: { tenantId } }),
      this.prisma.product.count({ where: { store: { tenantId } } }),
    ]);

    // Only compute per-store usage when needed (for store-scoped endpoints)
    return {
      stores: storeCount,
      productsTotal,
      quotas,
    };
  }

  // -------------------
  // ENFORCEMENT HELPERS
  // -------------------

  async assertCanCreateStore(tenantId: string) {
    const { plan } = await this.getTenantPlan(tenantId);
    const usage = await this.computeUsage(tenantId, plan.quotas);

    if (usage.stores >= plan.quotas.maxStores) {
      throw new ForbiddenException(
        this.formatLimitMessage({
          kind: 'maxStores',
          value: plan.quotas.maxStores,
        }),
      );
    }
  }

  async assertCanCreateProduct(tenantId: string, storeId: string) {
    const { plan } = await this.getTenantPlan(tenantId);

    const [perStoreCount, totalCount] = await Promise.all([
      this.prisma.product.count({ where: { storeId } }),
      this.prisma.product.count({ where: { store: { tenantId } } }),
    ]);

    if (perStoreCount >= plan.quotas.maxProductsPerStore) {
      throw new ForbiddenException(
        this.formatLimitMessage({
          kind: 'maxProductsPerStore',
          value: plan.quotas.maxProductsPerStore,
        }),
      );
    }

    if (
      typeof plan.quotas.maxProductsTotal === 'number' &&
      totalCount >= plan.quotas.maxProductsTotal
    ) {
      throw new ForbiddenException(
        this.formatLimitMessage({
          kind: 'maxProductsTotal',
          value: plan.quotas.maxProductsTotal,
        }),
      );
    }
  }

  async assertTagTierAllowed(tenantId: string, tagTier: number) {
    const { plan } = await this.getTenantPlan(tenantId);
    if (tagTier > plan.quotas.maxTagTier) {
      throw new ForbiddenException(
        this.formatLimitMessage({
          kind: 'maxTagTier',
          tagTier,
          maxTagTier: plan.quotas.maxTagTier,
        }),
      );
    }
  }

  // -------------------
  // MVP UPGRADE (NO PAYMENTS)
  // -------------------

  async upsertPlan(input: {
    code: string;
    name: string;
    quotas: Quotas;
    features?: PlanFeatures;
  }) {
    return this.prisma.plan.upsert({
      where: { code: input.code },
      update: {
        name: input.name,
        quotas: input.quotas,
        features: input.features ?? {},
      },
      create: {
        code: input.code,
        name: input.name,
        quotas: input.quotas,
        features: input.features ?? {},
      },
    });
  }

  async listAvailablePlans() {
    await this.ensureFreePlan();

    const plans = await this.prisma.plan.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return plans.map((plan) => this.mapPlan(plan));
  }

  listBillingProviders() {
    return this.billingProviders.listCapabilities();
  }

  async createCheckoutSession(params: {
    tenantId: string;
    planCode: string;
    customerEmail: string;
    preferredProvider?: BillingProviderName;
    billingCountry?: string;
    currency?: string;
  }) {
    if (params.planCode === DEFAULT_FREE_PLAN.code) {
      throw new BadRequestException('Free plan does not require checkout');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { code: params.planCode },
    });
    if (!plan) {
      throw new BadRequestException(`Plan not found: ${params.planCode}`);
    }

    const subscription = (await this.ensureTenantSubscription(
      params.tenantId,
    )) as SubscriptionWithPlan;
    const successUrl = new URL('/dashboard/billing', env.BILLING_APP_BASE_URL);
    successUrl.searchParams.set('checkout', 'success');
    successUrl.searchParams.set('plan', params.planCode);

    const cancelUrl = new URL('/dashboard/billing', env.BILLING_APP_BASE_URL);
    cancelUrl.searchParams.set('checkout', 'canceled');
    cancelUrl.searchParams.set('plan', params.planCode);

    const billingProvider = this.billingProviders.selectProvider({
      preferredProvider: params.preferredProvider,
      billingCountry: params.billingCountry,
      currency: params.currency,
    });

    const checkout = await billingProvider.createCheckoutSession({
      tenantId: params.tenantId,
      planCode: plan.code,
      planName: plan.name,
      customerEmail: params.customerEmail,
      billingCountry: params.billingCountry,
      currency: params.currency,
      successUrl: successUrl.toString(),
      cancelUrl: cancelUrl.toString(),
    });

    const updated = await this.prisma.subscription.update({
      where: { tenantId: params.tenantId },
      data: {
        provider: checkout.provider,
        providerCheckoutSessionId: checkout.checkoutSessionId,
        pendingPlanCode: plan.code,
      },
      include: { plan: true },
    });

    return {
      checkout,
      subscription: {
        id: updated.id,
        status: updated.status,
        pendingPlanCode: updated.pendingPlanCode,
        provider: updated.provider,
        providerCheckoutSessionId: updated.providerCheckoutSessionId,
        previousPlanCode: subscription.plan.code,
      },
      plan: this.mapPlan(plan),
    };
  }

  async processStubBillingWebhook(params: {
    secret?: string;
    event: StubBillingWebhookEvent;
  }) {
    if (params.secret !== env.BILLING_WEBHOOK_SECRET) {
      throw new UnauthorizedException('Invalid billing webhook secret');
    }

    if (env.BILLING_PROVIDER !== 'stub') {
      throw new BadRequestException('Stub billing webhooks are disabled');
    }

    const existingEvent = await this.prisma.billingEvent.findUnique({
      where: {
        provider_providerEventId: {
          provider: 'stub',
          providerEventId: params.event.eventId,
        },
      },
    });

    if (existingEvent?.processedAt) {
      return {
        processed: false,
        duplicate: true,
        eventId: existingEvent.providerEventId,
      };
    }

    const billingEvent =
      existingEvent ??
      (await this.prisma.billingEvent.create({
        data: {
          provider: 'stub',
          providerEventId: params.event.eventId,
          type: params.event.type,
          payload: params.event as Prisma.InputJsonValue,
        },
      }));

    if (params.event.type === 'checkout.completed') {
      const subscription = await this.activateStubCheckout(params.event);
      await this.prisma.billingEvent.update({
        where: { id: billingEvent.id },
        data: { processedAt: new Date() },
      });

      return {
        processed: true,
        duplicate: false,
        eventId: billingEvent.providerEventId,
        subscription,
      };
    }

    const subscription = await this.updateStubSubscriptionStatus(params.event);
    await this.prisma.billingEvent.update({
      where: { id: billingEvent.id },
      data: { processedAt: new Date() },
    });

    return {
      processed: true,
      duplicate: false,
      eventId: billingEvent.providerEventId,
      subscription,
    };
  }

  private async activateStubCheckout(event: StubBillingWebhookEvent) {
    if (!event.checkoutSessionId) {
      throw new BadRequestException('checkoutSessionId is required');
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        provider: 'stub',
        providerCheckoutSessionId: event.checkoutSessionId,
      },
      include: { plan: true },
    });

    if (!subscription?.pendingPlanCode) {
      throw new BadRequestException('Pending checkout subscription not found');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { code: subscription.pendingPlanCode },
    });
    if (!plan) {
      throw new BadRequestException(
        `Plan not found: ${subscription.pendingPlanCode}`,
      );
    }

    const now = new Date();
    const currentPeriodEnd = event.currentPeriodEnd
      ? new Date(event.currentPeriodEnd)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.subscription.update({
      where: { tenantId: subscription.tenantId },
      data: {
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        provider: 'stub',
        providerSubscriptionId:
          event.providerSubscriptionId ?? `stub_sub_${subscription.id}`,
        providerCheckoutSessionId: null,
        pendingPlanCode: null,
        currentPeriodStart: now,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        lastProviderSyncAt: now,
      },
      include: { plan: true },
    });

    return {
      id: updated.id,
      status: updated.status,
      planCode: updated.plan.code,
      currentPeriodEnd: updated.currentPeriodEnd,
    };
  }

  private async updateStubSubscriptionStatus(event: StubBillingWebhookEvent) {
    if (!event.providerSubscriptionId) {
      throw new BadRequestException('providerSubscriptionId is required');
    }

    const status =
      event.type === 'subscription.past_due'
        ? SubscriptionStatus.PAST_DUE
        : SubscriptionStatus.CANCELING;
    const now = new Date();
    const currentPeriodEnd = event.currentPeriodEnd
      ? new Date(event.currentPeriodEnd)
      : undefined;

    const updated = await this.prisma.subscription.update({
      where: { providerSubscriptionId: event.providerSubscriptionId },
      data: {
        status,
        cancelAtPeriodEnd: event.type === 'subscription.canceled',
        canceledAt: event.type === 'subscription.canceled' ? now : undefined,
        currentPeriodEnd,
        lastProviderSyncAt: now,
      },
      include: { plan: true },
    });

    return {
      id: updated.id,
      status: updated.status,
      planCode: updated.plan.code,
      currentPeriodEnd: updated.currentPeriodEnd,
    };
  }

  async setTenantPlan(tenantId: string, planCode: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { code: planCode },
    });
    if (!plan) throw new BadRequestException(`Plan not found: ${planCode}`);

    await this.ensureTenantSubscription(tenantId);

    return this.prisma.subscription.update({
      where: { tenantId },
      data: {
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        provider: 'internal',
        providerCheckoutSessionId: null,
        pendingPlanCode: null,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: null,
        lastProviderSyncAt: null,
      },
      include: { plan: true },
    });
  }
}
