#!/bin/sh
set -e

export NGINX_PORT="${PORT:-8080}"

envsubst '${NGINX_PORT}' < /etc/nginx/http.d/default.conf > /tmp/default.conf
cat /tmp/default.conf > /etc/nginx/http.d/default.conf

nginx

# Resolve any failed migration entries so Prisma can re-run them with fixed idempotent SQL
npx prisma migrate resolve --rolled-back 20260726000001_platform_fee_percentage --schema=libs/prisma/schema.prisma || true
npx prisma migrate deploy --schema=libs/prisma/schema.prisma

# Direct fallback: ensure PlatformFee.label column exists (bypasses Prisma migration issues)
echo "ALTER TABLE \"PlatformFee\" ADD COLUMN IF NOT EXISTS \"label\" TEXT;" | npx prisma db execute --stdin 2>/dev/null || true

node dist/apps/admin/main &
node dist/apps/company/main &
node dist/apps/customer/main &

wait -n
