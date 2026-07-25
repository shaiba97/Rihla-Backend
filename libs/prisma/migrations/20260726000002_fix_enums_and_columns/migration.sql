-- Safely add PAYOUT_REQUEST to NotificationType enum
DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE 'PAYOUT_REQUEST';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
