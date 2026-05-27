/*
  Warnings:

  - You are about to drop the column `left` on the `Bus` table. All the data in the column will be lost.
  - You are about to drop the column `right` on the `Bus` table. All the data in the column will be lost.
  - Added the required column `companyId` to the `Bus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `Trip` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Bus" DROP COLUMN "left",
DROP COLUMN "right",
ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "status" "TripStatus" NOT NULL;

-- AddForeignKey
ALTER TABLE "Bus" ADD CONSTRAINT "Bus_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
