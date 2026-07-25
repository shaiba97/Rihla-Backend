-- Convert PlatformFee from fixed amount to percentage model (idempotent)
ALTER TABLE "PlatformFee" ADD COLUMN IF NOT EXISTS "percentage" DoublePrecision NOT NULL DEFAULT 5;
UPDATE "PlatformFee" SET "percentage" = 5 WHERE "percentage" IS NULL OR "percentage" = 0;
ALTER TABLE "PlatformFee" DROP COLUMN IF EXISTS "amount";
ALTER TABLE "PlatformFee" DROP COLUMN IF EXISTS "currency";
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'PlatformFee' AND column_name = 'label'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'PlatformFee' AND column_name = 'description'
    ) THEN
      ALTER TABLE "PlatformFee" RENAME COLUMN "description" TO "label";
    ELSE
      ALTER TABLE "PlatformFee" ADD COLUMN "label" TEXT;
    END IF;
  END IF;
END $$;
