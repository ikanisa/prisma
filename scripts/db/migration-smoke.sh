#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <database-url>" >&2
  exit 1
fi

DATABASE_URL="$1"

apply_dir() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    return
  fi
  for file in $(ls -1 "$dir"/*.sql 2>/dev/null | sort); do
    echo "Applying ${file}"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
  done
}

apply_dir "supabase/migrations"
apply_dir "migrations/sql"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
SELECT 'analytics_events' AS table, to_regclass('public.analytics_events');
SELECT 'telemetry_service_levels' AS table, to_regclass('public.telemetry_service_levels');
SELECT 'openai_debug_events' AS table, to_regclass('public.openai_debug_events');
SQL
