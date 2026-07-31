-- Store receipt image base64 so receipts stay viewable even when the filesystem is wiped (Render ephemeral disk)
-- Idempotent: the UserAward receipt columns already exist on some environments, and WithdrawRequest has no prior migration.

-- Ensure WithdrawStatus enum exists (no prior migration creates it)
DO $$ BEGIN
  CREATE TYPE "WithdrawStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ensure WithdrawRequest table exists (no prior migration creates it)
CREATE TABLE IF NOT EXISTS "WithdrawRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "accountHolder" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "status" "WithdrawStatus" NOT NULL DEFAULT 'PENDING',
  "receiptFile" TEXT,
  "receiptData" TEXT,
  "receiptMime" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WithdrawRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WithdrawRequest_userId_idx" ON "WithdrawRequest"("userId");
CREATE INDEX IF NOT EXISTS "WithdrawRequest_status_idx" ON "WithdrawRequest"("status");

DO $$ BEGIN
  ALTER TABLE "WithdrawRequest" ADD CONSTRAINT "WithdrawRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "UserAward" ADD COLUMN IF NOT EXISTS "receiptData" TEXT;
ALTER TABLE "UserAward" ADD COLUMN IF NOT EXISTS "receiptMime" TEXT;

ALTER TABLE "WithdrawRequest" ADD COLUMN IF NOT EXISTS "receiptData" TEXT;
ALTER TABLE "WithdrawRequest" ADD COLUMN IF NOT EXISTS "receiptMime" TEXT;

ALTER TABLE "PayoutRecord" ADD COLUMN IF NOT EXISTS "receiptData" TEXT;
ALTER TABLE "PayoutRecord" ADD COLUMN IF NOT EXISTS "receiptMime" TEXT;
