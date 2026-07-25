const { Client } = require('pg');
const url = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!url) { console.error('No DATABASE_URL found'); process.exit(1); }
const client = new Client({ connectionString: url });

async function run() {
  await client.connect();
  try {
    await client.query('ALTER TABLE "PlatformFee" ADD COLUMN IF NOT EXISTS "label" TEXT');
    console.log('OK: PlatformFee.label column ensured');

    await client.query(`
      DO $$ BEGIN
        ALTER TYPE "NotificationType" ADD VALUE 'PAYOUT_REQUEST';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log('OK: NotificationType.PAYOUT_REQUEST ensured');
  } catch (e) {
    console.error('FAIL:', e.message);
  } finally {
    await client.end();
  }
}
run();
