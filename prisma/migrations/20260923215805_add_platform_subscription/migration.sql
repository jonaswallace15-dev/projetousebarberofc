-- CreateTable
CREATE TABLE "platform_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan" TEXT,
    "billing_cycle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'trialing',
    "trial_ends_at" TIMESTAMP(3),
    "pagarme_subscription_id" TEXT,
    "current_period_end" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_subscriptions_user_id_key" ON "platform_subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_subscriptions_pagarme_subscription_id_key" ON "platform_subscriptions"("pagarme_subscription_id");

-- AddForeignKey
ALTER TABLE "platform_subscriptions" ADD CONSTRAINT "platform_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
