-- Convert PlatformFee from fixed amount to percentage model
ALTER TABLE "PlatformFee" ADD COLUMN "percentage" DoublePrecision NOT NULL DEFAULT 5;
UPDATE "PlatformFee" SET "percentage" = 5 WHERE "percentage" IS NULL OR "percentage" = 0;
ALTER TABLE "PlatformFee" DROP COLUMN "amount";
ALTER TABLE "PlatformFee" DROP COLUMN "currency";
ALTER TABLE "PlatformFee" RENAME COLUMN "description" TO "label";
