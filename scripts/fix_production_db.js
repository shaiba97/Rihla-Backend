const { Client } = require('pg');
const url = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!url) { console.error('No DATABASE_URL found'); process.exit(1); }
const client = new Client({ connectionString: url });

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

    // 3. Clean up any failed Prisma migration entries so migrate deploy can proceed
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
