-- Convert PlatformFee from fixed amount to percentage model (idempotent)
ALTER TABLE "PlatformFee" ADD COLUMN IF NOT EXISTS "percentage" DoublePrecision NOT NULL DEFAULT 5;
UPDATE "PlatformFee" SET "percentage" = 5 WHERE "percentage" IS NULL OR "percentage" = 0;
ALTER TABLE "PlatformFee" DROP COLUMN IF EXISTS "amount";
ALTER TABLE "PlatformFee" DROP COLUMN IF EXISTS "currency";
DO $$ BEGIN
  ALTER TABLE "PlatformFee" RENAME COLUMN "description" TO "label";
EXCEPTION
  WHEN undefined_column THEN
    ALTER TABLE "PlatformFee" ADD COLUMN IF NOT EXISTS "label" TEXT;
  WHEN duplicate_column THEN
    NULL;
END $$;
