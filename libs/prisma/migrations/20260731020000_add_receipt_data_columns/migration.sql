-- AlterTable: store receipt image base64 so receipts stay viewable even when the filesystem is wiped (Render ephemeral disk)
ALTER TABLE "UserAward" ADD COLUMN "receiptData" TEXT;
ALTER TABLE "UserAward" ADD COLUMN "receiptMime" TEXT;

ALTER TABLE "WithdrawRequest" ADD COLUMN "receiptData" TEXT;
ALTER TABLE "WithdrawRequest" ADD COLUMN "receiptMime" TEXT;

ALTER TABLE "PayoutRecord" ADD COLUMN "receiptData" TEXT;
ALTER TABLE "PayoutRecord" ADD COLUMN "receiptMime" TEXT;
