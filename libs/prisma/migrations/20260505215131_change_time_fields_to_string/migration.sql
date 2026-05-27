/*
  Warnings:

  - You are about to drop the column `passengerAge` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `passengerGender` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `passengerName` on the `Booking` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[transactionId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `passenger` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "passengerAge",
DROP COLUMN "passengerGender",
DROP COLUMN "passengerName",
ADD COLUMN     "passenger" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "price" DECIMAL(10,2),
ADD COLUMN     "receiptFile" TEXT,
ADD COLUMN     "transactionId" TEXT;

-- AlterTable
ALTER TABLE "Trip" ALTER COLUMN "presence_time" SET DATA TYPE TEXT,
ALTER COLUMN "departureTime" SET DATA TYPE TEXT,
ALTER COLUMN "arrivalTime" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "Payment"("transactionId");
