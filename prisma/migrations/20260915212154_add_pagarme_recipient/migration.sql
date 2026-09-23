-- AlterTable
ALTER TABLE "withdrawals" ADD COLUMN     "pagarme_transfer_id" TEXT;

-- CreateTable
CREATE TABLE "pagarme_recipients" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pagarme_recipient_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "holder_type" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "registration_data" JSONB NOT NULL,
    "bank_account" JSONB NOT NULL,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagarme_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pagarme_recipients_user_id_key" ON "pagarme_recipients"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pagarme_recipients_pagarme_recipient_id_key" ON "pagarme_recipients"("pagarme_recipient_id");

-- AddForeignKey
ALTER TABLE "pagarme_recipients" ADD CONSTRAINT "pagarme_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

