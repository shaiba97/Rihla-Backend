/*
  Warnings:

  - You are about to drop the column `adminNotes` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `confirmedBy` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `paidAt` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `transferReference` on the `Payment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "adminNotes",
DROP COLUMN "confirmedBy",
DROP COLUMN "paidAt",
DROP COLUMN "transferReference",
ADD COLUMN     "paymentMethod" TEXT;
