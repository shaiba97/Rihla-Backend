-- Safely add PAYOUT_REQUEST to NotificationType enum
DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE 'PAYOUT_REQUEST';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Safely ensure PlatformFee has a 'label' column
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
