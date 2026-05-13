-- Expand subscription state before provider-backed checkout and webhooks land.
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'INCOMPLETE';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAST_DUE';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'CANCELING';

CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

ALTER TABLE "Subscription"
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'internal',
  ADD COLUMN "providerCustomerId" TEXT,
  ADD COLUMN "providerSubscriptionId" TEXT,
  ADD COLUMN "billingInterval" "BillingInterval",
  ADD COLUMN "currentPeriodStart" TIMESTAMP(3),
  ADD COLUMN "currentPeriodEnd" TIMESTAMP(3),
  ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canceledAt" TIMESTAMP(3),
  ADD COLUMN "pendingPlanCode" TEXT,
  ADD COLUMN "lastProviderSyncAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key"
  ON "Subscription"("providerSubscriptionId");

CREATE TABLE "BillingEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingEvent_provider_providerEventId_key"
  ON "BillingEvent"("provider", "providerEventId");

CREATE INDEX "BillingEvent_type_createdAt_idx"
  ON "BillingEvent"("type", "createdAt");
