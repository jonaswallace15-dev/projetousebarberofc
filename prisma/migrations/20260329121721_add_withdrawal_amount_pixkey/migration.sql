/*
  Warnings:

  - Added the required column `amount` to the `withdrawals` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pix_key` to the `withdrawals` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `withdrawals` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "withdrawals" ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "pix_key" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;
