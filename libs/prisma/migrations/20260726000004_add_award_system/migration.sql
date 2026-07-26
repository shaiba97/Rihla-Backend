-- CreateEnum
CREATE TYPE "AwardStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "AwardPack" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "minBookings" INTEGER NOT NULL DEFAULT 0,

    "awardValue" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AwardPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "status" "AwardStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAward_userId_packId_key" ON "UserAward"("userId", "packId");

-- CreateIndex
CREATE INDEX "UserAward_userId_idx" ON "UserAward"("userId");

-- CreateIndex
CREATE INDEX "UserAward_status_idx" ON "UserAward"("status");

-- AddForeignKey
ALTER TABLE "UserAward" ADD CONSTRAINT "UserAward_packId_fkey" FOREIGN KEY ("packId") REFERENCES "AwardPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
