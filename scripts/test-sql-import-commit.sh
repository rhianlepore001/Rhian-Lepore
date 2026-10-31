#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55442}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
PSQL=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$ROOT/supabase/tests/staff_edit_clients.harness.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/import_staging_services.harness.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/import_commit.harness.sql"
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261030130000_import_staging.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/import_staging.test.sql"
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261030130100_import_commit_undo.sql"
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261030130200_import_retention_limits.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/import_commit.test.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/import_review_fixes.test.sql"
# As migrações precisam poder ser reaplicadas sem erro.
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261030130100_import_commit_undo.sql"
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261030130200_import_retention_limits.sql"
"${PSQL[@]}" -f "$ROOT/docs/rollbacks/20261030130200_import_retention_limits.rollback.sql"
"${PSQL[@]}" -f "$ROOT/docs/rollbacks/20261030130100_import_commit_undo.rollback.sql"
"${PSQL[@]}" -f "$ROOT/docs/rollbacks/20261030130000_import_staging.rollback.sql"
count=$("${PSQL[@]}" -Atc "SELECT (SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('import_batches','import_staging_rows','import_column_mappings','import_source_links','import_created_records','import_created_categories','import_services_tenant_id_idx','idx_clients_user_name_folded','idx_clients_user_email_lower','idx_clients_user_extra_phones','idx_services_user_name_folded')) + (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND ((table_name='clients' AND column_name IN ('additional_phones','import_revision')) OR (table_name IN ('services','service_categories') AND column_name='import_revision'))) + (SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('import_fold_text','import_find_references','import_purge_company','import_purge_all','purge_expired_import_data','track_import_staging','clear_import_source_on_delete','commit_import_batch','undo_import_batch'))")
[ "$count" = 0 ]
