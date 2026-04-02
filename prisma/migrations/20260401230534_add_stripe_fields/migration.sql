-- AlterTable
ALTER TABLE "assinaturas_clientes" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "stripe_subscription_id" TEXT;

-- AlterTable
ALTER TABLE "planos_assinatura" ADD COLUMN     "stripe_price_id" TEXT;
