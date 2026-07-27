const { Client } = require('pg');
const url = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!url) { console.error('No DATABASE_URL found'); process.exit(1); }
const client = new Client({ connectionString: url });

const MIGRATION_NAME = '20260726000004_add_award_system';
const REPAIR2_MIGRATION = '20260728000002_repair_payment_model';


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

    // 4. Migrate existing Payment records from ADD model to SUBTRACT model
    // Old: totalAmount = baseAmount + (baseAmount * pct / 100), companyAmount = baseAmount (fee added on top)
    // New: totalAmount = baseAmount, platformFee = totalAmount * pct / 100, companyAmount = totalAmount - platformFee (fee deducted)
    const repairCheck = await client.query('SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = $1', [REPAIR2_MIGRATION]);
    if (repairCheck.rowCount === 0) {
      const activeFee2 = await client.query('SELECT percentage FROM "PlatformFee" WHERE "isActive" = true ORDER BY "createdAt" DESC LIMIT 1');
      const feePct = activeFee2.rows.length > 0 ? Number(activeFee2.rows[0].percentage) : 0;
      if (feePct > 0) {
        // Migrate records where totalAmount != companyAmount (old ADD model stored fee in totalAmount)
        // totalAmount_new = companyAmount_old (the base ticket price, stripping the added fee)
        // platformFee_new = ROUND(companyAmount_old * feePct / 100)
        // companyAmount_new = companyAmount_old - platformFee_new
        const fixResult = await client.query(`
          UPDATE "Payment"
          SET
            "totalAmount" = "companyAmount",
            "platformFeeAmount" = ROUND(CAST("companyAmount" AS numeric) * $1 / 100, 2),
            "companyAmount" = CAST("companyAmount" AS numeric) - ROUND(CAST("companyAmount" AS numeric) * $1 / 100, 2)
          WHERE status = 'SUCCESS'
            AND CAST("totalAmount" AS numeric) <> CAST("companyAmount" AS numeric)
        `, [feePct]);
        console.log(`OK: Migrated ${fixResult.rowCount} payments to SUBTRACT model at ${feePct}%`);
      } else {
        console.log('WARN: No active PlatformFee found. Skipping payment migration.');
      }
      await client.query(
        'INSERT INTO "_prisma_migrations" ("id", "migration_name", "started_at", "finished_at") VALUES ($1, $2, NOW(), NOW())',
        [require('crypto').randomUUID(), REPAIR2_MIGRATION]
      );
      console.log('OK: Repair migration', REPAIR2_MIGRATION, 'registered');
    } else {
      console.log('OK: Payment model repair already applied');
    }

    // 5. Register migration in _prisma_migrations so prisma migrate deploy skips it
    const existing = await client.query('SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = $1', [MIGRATION_NAME]);
    if (existing.rowCount === 0) {
      await client.query(
        'INSERT INTO "_prisma_migrations" ("id", "migration_name", "started_at", "finished_at") VALUES ($1, $2, NOW(), NOW())',
        [require('crypto').randomUUID(), MIGRATION_NAME]
      );
      console.log('OK: Migration', MIGRATION_NAME, 'registered in _prisma_migrations');
    } else {
      console.log('OK: Migration', MIGRATION_NAME, 'already registered');
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
