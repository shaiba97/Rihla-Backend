const { Client } = require('pg');
const url = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!url) { console.error('No DATABASE_URL found'); process.exit(1); }
const client = new Client({ connectionString: url });

async function run() {
  await client.connect();
  try {
    const activeFee = await client.query(
      'SELECT percentage FROM "PlatformFee" WHERE "isActive" = true ORDER BY "createdAt" DESC LIMIT 1'
    );
    const feePct = activeFee.rows.length > 0 ? Number(activeFee.rows[0].percentage) : 0;
    if (feePct <= 0) {
      console.log('No active PlatformFee found — aborting');
      return;
    }
    console.log(`Active fee: ${feePct}%`);

    const { rows: payments } = await client.query(`
      SELECT
        p.id,
        p."totalAmount",
        p."companyAmount",
        p."platformFeeAmount",
        t.price AS trip_price,
        array_length(b."seatNumbers", 1) AS seat_count
      FROM "Payment" p
      JOIN "Booking" b ON b.id = p."bookingId"
      JOIN "Trip" t ON t.id = b."tripId"
      WHERE p.status = 'SUCCESS'
    `);

    let fixed = 0;
    for (const p of rows) {
      const correctTotal = Number(p.trip_price) * Number(p.seat_count);
      const correctFee = Math.round(correctTotal * feePct) / 100;
      const correctCompany = correctTotal - correctFee;

      if (
        Number(p.totalAmount) !== correctTotal ||
        Number(p.companyAmount) !== correctCompany ||
        Number(p.platformFeeAmount) !== correctFee
      ) {
        await client.query(`
          UPDATE "Payment"
          SET
            "totalAmount" = $1,
            "platformFeeAmount" = $2,
            "companyAmount" = $3
          WHERE id = $4
        `, [correctTotal, correctFee, correctCompany, p.id]);
        console.log(`Fixed ${p.id}: totalAmount ${p.totalAmount}→${correctTotal}, companyAmount ${p.companyAmount}→${correctCompany}, platformFee ${p.platformFeeAmount}→${correctFee}`);
        fixed++;
      }
    }
    console.log(`Done. Fixed ${fixed} of ${rows.length} payments.`);
  } catch (e) {
    console.error('FAIL:', e.message);
  } finally {
    await client.end();
  }
}
run();
