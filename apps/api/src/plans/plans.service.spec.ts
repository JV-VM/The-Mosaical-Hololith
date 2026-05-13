import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionStatus } from '@prisma/client';

import { PrismaService } from '../shared/prisma/prisma.service';
import { BillingProviderRouter } from './billing-provider-router.service';
import { PlansService, Quotas } from './plans.service';

function createPrismaMock() {
  return {
    plan: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    subscription: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    billingEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    store: {
      count: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
  };
}

const freePlan = {
  id: 'free-plan',
  code: 'free',
  name: 'Free',
  quotas: {
    maxStores: 1,
    maxProductsPerStore: 10,
    maxProductsTotal: 10,
    maxTagTier: 1,
  },
  features: {},
};

const proPlan = {
  id: 'pro-plan',
  code: 'pro',
  name: 'Pro',
  quotas: {
    maxStores: 5,
    maxProductsPerStore: 100,
    maxProductsTotal: 500,
    maxTagTier: 3,
  },
  features: {},
};

function subscriptionWithPlan(
  quotas: Quotas,
  overrides: Partial<{
    planCode: string;
    status: SubscriptionStatus;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
  }> = {},
) {
  return {
    id: 'sub-1',
    tenantId: 'tenant-1',
    planId: 'plan-1',
    status: overrides.status ?? SubscriptionStatus.ACTIVE,
    provider: 'internal',
    providerCustomerId: null,
    providerSubscriptionId: null,
    providerCheckoutSessionId: null,
    billingInterval: null,
    currentPeriodStart: overrides.currentPeriodStart ?? null,
    currentPeriodEnd: overrides.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: overrides.cancelAtPeriodEnd ?? false,
    canceledAt: null,
    pendingPlanCode: null,
    lastProviderSyncAt: null,
    plan: {
      id: 'plan-1',
      code: overrides.planCode ?? 'free',
      name: overrides.planCode ?? 'Free',
      quotas,
      features: {},
    },
  };
}

describe('PlansService', () => {
  let service: PlansService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let billingProviderMock: { createCheckoutSession: jest.Mock };
  let billingProviderRouterMock: {
    listCapabilities: jest.Mock;
    selectProvider: jest.Mock;
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    billingProviderMock = {
      createCheckoutSession: jest.fn(),
    };
    billingProviderRouterMock = {
      listCapabilities: jest.fn(),
      selectProvider: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: BillingProviderRouter,
          useValue: billingProviderRouterMock,
        },
      ],
    }).compile();

    service = module.get<PlansService>(PlansService);

    prismaMock.plan.upsert.mockReset();
    prismaMock.subscription.findUnique.mockReset();
    prismaMock.subscription.findFirst.mockReset();
    prismaMock.subscription.create.mockReset();
    prismaMock.subscription.update.mockReset();
    prismaMock.billingEvent.findUnique.mockReset();
    prismaMock.billingEvent.create.mockReset();
    prismaMock.billingEvent.update.mockReset();
    prismaMock.plan.findUnique.mockReset();
    prismaMock.plan.findMany.mockReset();
    billingProviderMock.createCheckoutSession.mockReset();
    billingProviderRouterMock.listCapabilities.mockReset();
    billingProviderRouterMock.selectProvider.mockReset();
    billingProviderRouterMock.selectProvider.mockReturnValue(
      billingProviderMock,
    );
    prismaMock.store.count.mockReset();
    prismaMock.product.count.mockReset();
  });

  describe('listAvailablePlans', () => {
    it('returns the plan catalog', async () => {
      prismaMock.plan.upsert.mockResolvedValue(freePlan);
      prismaMock.plan.findMany.mockResolvedValue([freePlan, proPlan]);

      const result = await service.listAvailablePlans();

      expect(prismaMock.plan.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'asc' },
      });
      expect(result.map((plan) => plan.code)).toEqual(['free', 'pro']);
    });
  });

  describe('listBillingProviders', () => {
    it('returns provider capability metadata from the router', () => {
      billingProviderRouterMock.listCapabilities.mockReturnValue([
        { name: 'stub', implemented: true },
        { name: 'stripe', implemented: false },
      ]);

      expect(service.listBillingProviders()).toEqual([
        { name: 'stub', implemented: true },
        { name: 'stripe', implemented: false },
      ]);
    });
  });

  describe('createCheckoutSession', () => {
    it('creates a provider checkout session and records pending plan state', async () => {
      prismaMock.plan.findUnique.mockResolvedValue(proPlan);
      prismaMock.plan.upsert.mockResolvedValue(freePlan);
      prismaMock.subscription.findUnique.mockResolvedValue(
        subscriptionWithPlan(freePlan.quotas),
      );
      billingProviderMock.createCheckoutSession.mockResolvedValue({
        provider: 'stub',
        checkoutSessionId: 'stub-session-1',
        checkoutUrl: 'http://localhost:3100/billing/stub/checkout',
      });
      prismaMock.subscription.update.mockResolvedValue({
        ...subscriptionWithPlan(freePlan.quotas),
        provider: 'stub',
        providerCheckoutSessionId: 'stub-session-1',
        pendingPlanCode: 'pro',
      });

      const result = await service.createCheckoutSession({
        tenantId: 'tenant-1',
        planCode: 'pro',
        customerEmail: 'owner@example.com',
        preferredProvider: 'stub',
        billingCountry: 'BR',
        currency: 'BRL',
      });

      expect(billingProviderRouterMock.selectProvider).toHaveBeenCalledWith({
        preferredProvider: 'stub',
        billingCountry: 'BR',
        currency: 'BRL',
      });
      expect(billingProviderMock.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          planCode: 'pro',
          planName: 'Pro',
          customerEmail: 'owner@example.com',
          billingCountry: 'BR',
          currency: 'BRL',
        }),
      );
      expect(prismaMock.subscription.update).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        data: {
          provider: 'stub',
          providerCheckoutSessionId: 'stub-session-1',
          pendingPlanCode: 'pro',
        },
        include: { plan: true },
      });
      expect(result.checkout.checkoutSessionId).toBe('stub-session-1');
      expect(result.subscription.previousPlanCode).toBe('free');
      expect(result.plan.code).toBe('pro');
    });

    it('rejects checkout for the free plan', async () => {
      await expect(
        service.createCheckoutSession({
          tenantId: 'tenant-1',
          planCode: 'free',
          customerEmail: 'owner@example.com',
        }),
      ).rejects.toThrow(/Free plan/);
    });
  });

  describe('processStubBillingWebhook', () => {
    it('activates a pending checkout exactly once', async () => {
      const pendingSubscription = {
        ...subscriptionWithPlan(freePlan.quotas),
        provider: 'stub',
        providerCheckoutSessionId: 'stub-session-1',
        pendingPlanCode: 'pro',
      };
      prismaMock.billingEvent.findUnique.mockResolvedValue(null);
      prismaMock.billingEvent.create.mockResolvedValue({
        id: 'event-1',
        provider: 'stub',
        providerEventId: 'evt-1',
        type: 'checkout.completed',
        processedAt: null,
      });
      prismaMock.subscription.findFirst.mockResolvedValue(pendingSubscription);
      prismaMock.plan.findUnique.mockResolvedValue(proPlan);
      prismaMock.subscription.update.mockResolvedValue({
        ...pendingSubscription,
        planId: proPlan.id,
        plan: proPlan,
        status: SubscriptionStatus.ACTIVE,
        providerSubscriptionId: 'stub-sub-1',
        providerCheckoutSessionId: null,
        pendingPlanCode: null,
        currentPeriodEnd: new Date('2026-06-12T00:00:00.000Z'),
      });
      prismaMock.billingEvent.update.mockResolvedValue({
        id: 'event-1',
        processedAt: new Date(),
      });

      const result = await service.processStubBillingWebhook({
        secret: 'local-billing-webhook-secret',
        event: {
          eventId: 'evt-1',
          type: 'checkout.completed',
          checkoutSessionId: 'stub-session-1',
          providerSubscriptionId: 'stub-sub-1',
          currentPeriodEnd: '2026-06-12T00:00:00.000Z',
        },
      });

      expect(prismaMock.billingEvent.create).toHaveBeenCalledWith({
        data: {
          provider: 'stub',
          providerEventId: 'evt-1',
          type: 'checkout.completed',
          payload: expect.objectContaining({ eventId: 'evt-1' }),
        },
      });
      expect(prismaMock.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
          data: expect.objectContaining({
            planId: 'pro-plan',
            status: SubscriptionStatus.ACTIVE,
            providerSubscriptionId: 'stub-sub-1',
            providerCheckoutSessionId: null,
            pendingPlanCode: null,
          }),
        }),
      );
      expect(result).toMatchObject({
        processed: true,
        duplicate: false,
        subscription: { planCode: 'pro' },
      });
    });

    it('does not reprocess an already processed event', async () => {
      prismaMock.billingEvent.findUnique.mockResolvedValue({
        id: 'event-1',
        provider: 'stub',
        providerEventId: 'evt-1',
        type: 'checkout.completed',
        processedAt: new Date(),
      });

      const result = await service.processStubBillingWebhook({
        secret: 'local-billing-webhook-secret',
        event: {
          eventId: 'evt-1',
          type: 'checkout.completed',
          checkoutSessionId: 'stub-session-1',
        },
      });

      expect(prismaMock.subscription.update).not.toHaveBeenCalled();
      expect(result).toEqual({
        processed: false,
        duplicate: true,
        eventId: 'evt-1',
      });
    });
  });

  describe('ensureTenantSubscription', () => {
    it('creates a subscription when the tenant has none', async () => {
      prismaMock.plan.upsert.mockResolvedValue(freePlan);
      prismaMock.subscription.findUnique.mockResolvedValue(null);
      prismaMock.subscription.create.mockResolvedValue(
        subscriptionWithPlan({
          maxStores: 1,
          maxProductsPerStore: 10,
          maxProductsTotal: 10,
          maxTagTier: 1,
        }),
      );

      const result = await service.ensureTenantSubscription('tenant-1');

      expect(prismaMock.plan.upsert).toHaveBeenCalledTimes(1);
      expect(prismaMock.subscription.findUnique).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        include: { plan: true },
      });
      expect(prismaMock.subscription.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          planId: 'free-plan',
          status: SubscriptionStatus.ACTIVE,
        },
        include: { plan: true },
      });
      expect(result).toMatchObject({
        tenantId: 'tenant-1',
        plan: { id: 'plan-1' },
      });
    });
  });

  describe('getTenantPlan', () => {
    it('uses paid entitlements while a canceling subscription is inside currentPeriodEnd', async () => {
      const paidQuotas: Quotas = {
        maxStores: 5,
        maxProductsPerStore: 100,
        maxProductsTotal: 500,
        maxTagTier: 3,
      };
      prismaMock.plan.upsert.mockResolvedValue(freePlan);
      prismaMock.subscription.findUnique.mockResolvedValue(
        subscriptionWithPlan(paidQuotas, {
          planCode: 'pro',
          status: SubscriptionStatus.CANCELING,
          currentPeriodEnd: new Date(Date.now() + 60_000),
          cancelAtPeriodEnd: true,
        }),
      );

      const result = await service.getTenantPlan('tenant-1');

      expect(result.plan.code).toBe('pro');
      expect(result.subscription.entitlement).toMatchObject({
        source: 'subscription',
        planCode: 'pro',
      });
    });

    it('falls back to free after currentPeriodEnd when payment is past due', async () => {
      const paidQuotas: Quotas = {
        maxStores: 5,
        maxProductsPerStore: 100,
        maxProductsTotal: 500,
        maxTagTier: 3,
      };
      prismaMock.plan.upsert.mockResolvedValue(freePlan);
      prismaMock.subscription.findUnique.mockResolvedValue(
        subscriptionWithPlan(paidQuotas, {
          planCode: 'pro',
          status: SubscriptionStatus.PAST_DUE,
          currentPeriodEnd: new Date(Date.now() - 60_000),
        }),
      );

      const result = await service.getTenantPlan('tenant-1');

      expect(result.plan.code).toBe('free');
      expect(result.subscription.entitlement).toMatchObject({
        source: 'free_fallback',
        planCode: 'free',
      });
    });
  });

  describe('assertCanCreateStore', () => {
    it('allows creation when usage is below the plan quota', async () => {
      const quotas: Quotas = {
        maxStores: 2,
        maxProductsPerStore: 10,
        maxProductsTotal: 10,
        maxTagTier: 1,
      };
      prismaMock.plan.upsert.mockResolvedValue(freePlan);
      prismaMock.subscription.findUnique.mockResolvedValue(
        subscriptionWithPlan(quotas),
      );
      prismaMock.store.count.mockResolvedValue(1);
      prismaMock.product.count.mockResolvedValue(0);

      await expect(
        service.assertCanCreateStore('tenant-1'),
      ).resolves.toBeUndefined();
    });

    it('throws ForbiddenException when the store quota is reached', async () => {
      const quotas: Quotas = {
        maxStores: 1,
        maxProductsPerStore: 10,
        maxProductsTotal: 10,
        maxTagTier: 1,
      };
      prismaMock.plan.upsert.mockResolvedValue(freePlan);
      prismaMock.subscription.findUnique.mockResolvedValue(
        subscriptionWithPlan(quotas),
      );
      prismaMock.store.count.mockResolvedValue(1);
      prismaMock.product.count.mockResolvedValue(0);

      try {
        await service.assertCanCreateStore('tenant-1');
        throw new Error('Expected assertCanCreateStore to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        if (error instanceof Error) {
          expect(error.message).toContain('maxStores=1');
        }
      }
    });
  });

  describe('assertCanCreateProduct', () => {
    it('throws when maxProductsPerStore is exceeded', async () => {
      const quotas: Quotas = {
        maxStores: 1,
        maxProductsPerStore: 2,
        maxProductsTotal: 10,
        maxTagTier: 1,
      };
      prismaMock.plan.upsert.mockResolvedValue(freePlan);
      prismaMock.subscription.findUnique.mockResolvedValue(
        subscriptionWithPlan(quotas),
      );
      prismaMock.product.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0);

      await expect(
        service.assertCanCreateProduct('tenant-1', 'store-1'),
      ).rejects.toThrow(/maxProductsPerStore=2/);
    });

    it('throws when maxProductsTotal is reached', async () => {
      const quotas: Quotas = {
        maxStores: 1,
        maxProductsPerStore: 10,
        maxProductsTotal: 3,
        maxTagTier: 1,
      };
      prismaMock.plan.upsert.mockResolvedValue(freePlan);
      prismaMock.subscription.findUnique.mockResolvedValue(
        subscriptionWithPlan(quotas),
      );
      prismaMock.product.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(3);

      await expect(
        service.assertCanCreateProduct('tenant-1', 'store-1'),
      ).rejects.toThrow(/maxProductsTotal=3/);
    });
  });

  describe('assertTagTierAllowed', () => {
    it('throws when the tag tier is above the plan limit', async () => {
      const quotas: Quotas = {
        maxStores: 1,
        maxProductsPerStore: 10,
        maxProductsTotal: 10,
        maxTagTier: 1,
      };
      prismaMock.plan.upsert.mockResolvedValue(freePlan);
      prismaMock.subscription.findUnique.mockResolvedValue(
        subscriptionWithPlan(quotas),
      );

      await expect(service.assertTagTierAllowed('tenant-1', 2)).rejects.toThrow(
        /maxTagTier=1/,
      );
    });
  });
});
