#!/bin/sh
set -e

export NGINX_PORT="${PORT:-8080}"

envsubst '${NGINX_PORT}' < /etc/nginx/http.d/default.conf > /tmp/default.conf
cat /tmp/default.conf > /etc/nginx/http.d/default.conf

nginx

node dist/apps/admin/main &
node dist/apps/company/main &
node dist/apps/customer/main &

wait -n
