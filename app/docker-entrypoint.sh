#!/bin/sh
set -eu

mkdir -p /data

if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="file:/data/registry-aio.db"
fi

echo "Running prisma migrate deploy..."
./node_modules/.bin/prisma migrate deploy

echo "Starting Nuxt..."
exec node .output/server/index.mjs
