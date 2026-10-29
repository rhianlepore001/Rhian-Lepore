#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55441}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
PSQL=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$ROOT/supabase/tests/staff_edit_clients.harness.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/import_staging_services.harness.sql"
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261029074503_import_staging.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/import_staging.test.sql"
"${PSQL[@]}" -f "$ROOT/supabase/rollbacks/20261029074503_import_staging.rollback.sql"
count=$("${PSQL[@]}" -Atc "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('import_batches','import_staging_rows','import_column_mappings','import_source_links','import_clients_tenant_id_idx','import_services_tenant_id_idx')")
[ "$count" = 0 ]
