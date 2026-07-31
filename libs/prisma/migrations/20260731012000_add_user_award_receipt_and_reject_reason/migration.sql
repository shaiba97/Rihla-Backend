-- AlterTable: add receiptFile and rejectReason columns to UserAward
ALTER TABLE "UserAward" ADD COLUMN "receiptFile" TEXT;
ALTER TABLE "UserAward" ADD COLUMN "rejectReason" TEXT;
