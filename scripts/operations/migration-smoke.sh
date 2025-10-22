#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER_NAME=${DB_CONTAINER_NAME:-prisma-migration-smoke-db}
DB_IMAGE=${DB_IMAGE:-supabase/postgres:15.1.1.41}
DB_PORT=${DB_PORT:-6543}
DATABASE_URL=${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:${DB_PORT}/postgres}
PGPASSWORD=${PGPASSWORD:-postgres}

cleanup() {
  docker rm -f "$DB_CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required for migration smoke tests" >&2
  exit 1
fi
if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required for migration smoke tests" >&2
  exit 1
fi

echo "Starting temporary Supabase Postgres container (${DB_IMAGE}) on port ${DB_PORT}"
docker run \
  --rm \
  --detach \
  --name "$DB_CONTAINER_NAME" \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=postgres \
  -e POSTGRES_USER=postgres \
  -p "${DB_PORT}:5432" \
  "$DB_IMAGE" >/dev/null

until PGPASSWORD="$PGPASSWORD" psql "$DATABASE_URL" -c 'select 1' >/dev/null 2>&1; do
  sleep 1
  echo "Waiting for database to accept connections..."
done

echo "Applying migrations from migrations/sql"
shopt -s nullglob
declare -i applied=0
for file in $(ls -1 migrations/sql/*.sql | sort); do
  echo "→ $file"
  PGPASSWORD="$PGPASSWORD" psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file" >/dev/null
  applied+=1
done

echo "Applied ${applied} migrations"

echo "Verifying telemetry tables exist"
PGPASSWORD="$PGPASSWORD" psql "$DATABASE_URL" -At <<'SQL'
select 'telemetry_alerts=' || coalesce(to_regclass('public.telemetry_alerts')::text, 'missing');
select 'autonomy_telemetry_events=' || coalesce(to_regclass('public.autonomy_telemetry_events')::text, 'missing');
SQL

echo "Migration smoke test complete"
