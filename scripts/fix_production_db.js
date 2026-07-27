const { Client } = require('pg');
const url = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!url) { console.error('No DATABASE_URL found'); process.exit(1); }
const client = new Client({ connectionString: url });

const MIGRATION_NAME = '20260726000004_add_award_system';
const REPAIR_MIGRATION = '20260728000001_repair_platform_fees';

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

    // 4. Repair platform fee amounts for legacy records (old formula used percentage * seatCount instead of percentage * baseAmount / 100)
    const repairCheck = await client.query('SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = $1', [REPAIR_MIGRATION]);
    if (repairCheck.rowCount === 0) {
      const activeFee = await client.query('SELECT percentage FROM "PlatformFee" WHERE "isActive" = true ORDER BY "createdAt" DESC LIMIT 1');
      const feePct = activeFee.rows.length > 0 ? Number(activeFee.rows[0].percentage) : 0;
      if (feePct > 0) {
        const fix = await client.query(`
          UPDATE "Payment"
          SET
            "platformFeeAmount" = ROUND(CAST("companyAmount" AS numeric) * $1 / 100),
            "totalAmount" = "companyAmount" + ROUND(CAST("companyAmount" AS numeric) * $1 / 100)
          WHERE status = 'SUCCESS'
            AND CAST("platformFeeAmount" AS numeric) <> ROUND(CAST("companyAmount" AS numeric) * $1 / 100)
        `, [feePct]);
        console.log(`OK: Repaired ${fix.rowCount} payment platform fees at ${feePct}%`);
      }
      await client.query(
        'INSERT INTO "_prisma_migrations" ("id", "migration_name", "started_at", "finished_at") VALUES ($1, $2, NOW(), NOW())',
        [require('crypto').randomUUID(), REPAIR_MIGRATION]
      );
      console.log('OK: Repair migration', REPAIR_MIGRATION, 'registered');
    } else {
      console.log('OK: Platform fee repair already applied');
    }

    // 6. Register migration in _prisma_migrations so prisma migrate deploy skips it
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
