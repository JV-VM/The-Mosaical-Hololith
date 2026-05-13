ALTER TABLE "Subscription"
  ADD COLUMN "providerCheckoutSessionId" TEXT;

CREATE UNIQUE INDEX "Subscription_providerCheckoutSessionId_key"
  ON "Subscription"("providerCheckoutSessionId");
