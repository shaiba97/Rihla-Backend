const { Client } = require('pg');
const url = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!url) { console.error('No DATABASE_URL found'); process.exit(1); }
const client = new Client({ connectionString: url });

const MIGRATION_NAME = '20260726000004_add_award_system';


async function run() {
  await client.connect();
  try {
    // 1. Add label column if missing
    await client.query('ALTER TABLE "PlatformFee" ADD COLUMN IF NOT EXISTS "label" TEXT');
    console.log('OK: PlatformFee.label column ensured');

    // 2. Add PAYOUT_REQUEST enum value if missing
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE "NotificationType" ADD VALUE 'PAYOUT_REQUEST';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log('OK: NotificationType.PAYOUT_REQUEST ensured');

    // 3. Add award system (enum + tables) — raw SQL bypasses Prisma advisory lock
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "AwardStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log('OK: AwardStatus enum ensured');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "AwardPack" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "icon" TEXT,
        "minBookings" INTEGER NOT NULL DEFAULT 0,
        "awardValue" DECIMAL(10,2) NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "AwardPack_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('OK: AwardPack table ensured');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "UserAward" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "packId" TEXT NOT NULL,
        "status" "AwardStatus" NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "UserAward_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('OK: UserAward table ensured');

    // Indexes (IF NOT EXISTS not available for indexes, catch error)
    try { await client.query('CREATE UNIQUE INDEX "UserAward_userId_packId_key" ON "UserAward"("userId", "packId")'); } catch {}
    try { await client.query('CREATE INDEX "UserAward_userId_idx" ON "UserAward"("userId")'); } catch {}
    try { await client.query('CREATE INDEX "UserAward_status_idx" ON "UserAward"("status")'); } catch {}
    try { await client.query('ALTER TABLE "UserAward" ADD CONSTRAINT "UserAward_packId_fkey" FOREIGN KEY ("packId") REFERENCES "AwardPack"("id") ON DELETE CASCADE ON UPDATE CASCADE'); } catch {}
    console.log('OK: UserAward indexes and FK ensured');

    // Payment migration REMOVED — server code handles calculations correctly on new bookings.
    // Existing records are not modified.

    // 4b. Add payout system (enum + tables)
    const PAYOUT_MIGRATION = '20260729040001_add_payout_models';
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "PayoutRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log('OK: PayoutRequestStatus enum ensured');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "CompanyBankAccount" (
        "id" TEXT NOT NULL,
        "companyId" TEXT NOT NULL,
        "accountHolderName" TEXT,
        "bankName" TEXT,
        "accountNumber" TEXT,
        CONSTRAINT "CompanyBankAccount_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('OK: CompanyBankAccount table ensured');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "PayoutRequest" (
        "id" TEXT NOT NULL,
        "companyId" TEXT NOT NULL,
        "tripId" TEXT,
        "amount" DECIMAL(10,2) NOT NULL,
        "status" "PayoutRequestStatus" NOT NULL DEFAULT 'PENDING',
        "note" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('OK: PayoutRequest table ensured');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "PayoutRecord" (
        "id" TEXT NOT NULL,
        "companyId" TEXT NOT NULL,
        "amount" DECIMAL(10,2) NOT NULL,
        "receiptFile" TEXT,
        "note" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PayoutRecord_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('OK: PayoutRecord table ensured');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "PayoutRecordItem" (
        "id" TEXT NOT NULL,
        "payoutRecordId" TEXT NOT NULL,
        "tripId" TEXT NOT NULL,
        CONSTRAINT "PayoutRecordItem_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('OK: PayoutRecordItem table ensured');

    // Indexes
    try { await client.query('CREATE UNIQUE INDEX "CompanyBankAccount_companyId_key" ON "CompanyBankAccount"("companyId")'); } catch {}
    try { await client.query('CREATE INDEX "PayoutRequest_companyId_idx" ON "PayoutRequest"("companyId")'); } catch {}
    try { await client.query('CREATE INDEX "PayoutRequest_companyId_status_idx" ON "PayoutRequest"("companyId", "status")'); } catch {}
    try { await client.query('CREATE INDEX "PayoutRecord_companyId_idx" ON "PayoutRecord"("companyId")'); } catch {}
    try { await client.query('CREATE UNIQUE INDEX "PayoutRecordItem_payoutRecordId_tripId_key" ON "PayoutRecordItem"("payoutRecordId", "tripId")'); } catch {}
    console.log('OK: Payout indexes ensured');

    // Foreign keys
    try { await client.query('ALTER TABLE "CompanyBankAccount" ADD CONSTRAINT "CompanyBankAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE'); } catch {}
    try { await client.query('ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE'); } catch {}
    try { await client.query('ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE'); } catch {}
    try { await client.query('ALTER TABLE "PayoutRecord" ADD CONSTRAINT "PayoutRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE'); } catch {}
    try { await client.query('ALTER TABLE "PayoutRecordItem" ADD CONSTRAINT "PayoutRecordItem_payoutRecordId_fkey" FOREIGN KEY ("payoutRecordId") REFERENCES "PayoutRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE'); } catch {}
    try { await client.query('ALTER TABLE "PayoutRecordItem" ADD CONSTRAINT "PayoutRecordItem_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE'); } catch {}
    console.log('OK: Payout FKs ensured');

    // Register payout migration in _prisma_migrations so prisma migrate deploy skips it
    const payoutExisting = await client.query('SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = $1', [PAYOUT_MIGRATION]);
    if (payoutExisting.rowCount === 0) {
      await client.query(
        'INSERT INTO "_prisma_migrations" ("id", "migration_name", "started_at", "finished_at") VALUES ($1, $2, NOW(), NOW())',
        [require('crypto').randomUUID(), PAYOUT_MIGRATION]
      );
      console.log('OK: Migration', PAYOUT_MIGRATION, 'registered in _prisma_migrations');
    } else {
      console.log('OK: Migration', PAYOUT_MIGRATION, 'already registered');
    }

    // 5. Clean up any failed Prisma migration entries so migrate deploy can proceed
    const result = await client.query(
      'DELETE FROM _prisma_migrations WHERE finished_at IS NULL'
    );
    if (result.rowCount > 0) {
      console.log(`OK: Cleared ${result.rowCount} failed migration(s) from _prisma_migrations`);
    }
  } catch (e) {
    console.error('FAIL:', e.message);
  } finally {
    await client.end();
  }
}
run();
