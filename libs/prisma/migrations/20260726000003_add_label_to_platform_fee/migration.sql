-- Add label column to PlatformFee if missing (production fix for P2022)
ALTER TABLE "PlatformFee" ADD COLUMN IF NOT EXISTS "label" TEXT;

-- Also make the existing migration chain idempotent: if amount/currency still exist, drop them safely
ALTER TABLE "PlatformFee" DROP COLUMN IF EXISTS "amount";
ALTER TABLE "PlatformFee" DROP COLUMN IF EXISTS "currency";
