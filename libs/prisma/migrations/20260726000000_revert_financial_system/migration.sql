-- Revert PlatformFee: drop percentage, restore amount and currency
ALTER TABLE "PlatformFee" DROP COLUMN IF EXISTS "percentage";
ALTER TABLE "PlatformFee" ADD COLUMN IF NOT EXISTS "amount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "PlatformFee" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'جنيه سوداني';

-- Revert NotificationType: remove PAYOUT_REQUEST from enum
-- First, update any existing records using PAYOUT_REQUEST to SYSTEM
UPDATE "Notification" SET "type" = 'SYSTEM' WHERE "type" = 'PAYOUT_REQUEST';

-- Create new enum type without PAYOUT_REQUEST
CREATE TYPE "NotificationType_new" AS ENUM ('BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_REJECTED', 'BOOKING_CANCELLED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'PAYMENT_REJECTED', 'SYSTEM');

-- Alter the table to use the new type
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");

-- Drop old type and rename new one
DROP TYPE "NotificationType";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
