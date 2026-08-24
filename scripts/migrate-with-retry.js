/**
 * Runs `prisma migrate deploy` with retries.
 *
 * Multiple Render services share ONE Neon database, so two booting instances
 * can race for the same migration advisory lock. Prisma gives up after ~10s;
 * this wrapper keeps trying well past that so deploys survive lock contention
 * and slow pooler connections instead of failing the whole deploy.
 *
 * Additionally, migrations are ALWAYS pointed at the DIRECT (non-pooled)
 * Neon host: session-level advisory locks hang over PgBouncer transaction
 * pooling (see prisma.config.ts resolveDirectUrl for the same rule).
 */
const { spawnSync } = require('child_process');

const SCHEMA = 'libs/prisma/schema.prisma';
const MAX_ATTEMPTS = 5;
const BACKOFF_MS = 15000;

function deriveDirectUrl(url) {
  if (!url) return url;
  const explicit =
    process.env['DATABASE_URL_UNPOOLED'] ?? process.env['DIRECT_URL'];
  if (explicit) return explicit;
  return url.replace(/-pooler\./, '.');
}

function mask(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username}:***@${u.hostname}${u.pathname}`;
  } catch {
    return '(unparseable db url)';
  }
}

const rawUrl = process.env['DATABASE_URL'];
if (!rawUrl) {
  console.error('[migrate] DATABASE_URL is not set');
  process.exit(1);
}
const directUrl = deriveDirectUrl(rawUrl);
console.log(`[migrate] migrating against: ${mask(directUrl)}`);

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  console.log(`[migrate] prisma migrate deploy — attempt ${attempt}/${MAX_ATTEMPTS}`);
  const r = spawnSync(
    'npx',
    ['prisma', 'migrate', 'deploy', `--schema=${SCHEMA}`],
    {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: directUrl },
    },
  );

  if (r.status === 0) {
    console.log('[migrate] deploy completed successfully');
    process.exit(0);
  }

  console.error(`[migrate] attempt ${attempt} failed (exit ${r.status})`);
  if (attempt < MAX_ATTEMPTS) {
    console.log(`[migrate] retrying in ${BACKOFF_MS / 1000}s…`);
    // Synchronous sleep — safe everywhere, blocks only this bootstrap step.
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, BACKOFF_MS);
  }
}

console.error('[migrate] all attempts failed — deploy aborted');
process.exit(1);
