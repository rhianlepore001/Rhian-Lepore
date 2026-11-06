#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/17/bin}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55484}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
ARGS=()
if [ -n "${PGSHARE:-}" ]; then ARGS=(-L "$PGSHARE"); fi
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust "${ARGS[@]}" >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses='' -c timezone=UTC" -l "$TMP/log" start >/dev/null
PSQL=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$ROOT/supabase/tests/staff_performance.harness.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/chair_hour_legacy.harness.sql"
sed -n '/^CREATE OR REPLACE FUNCTION public.complete_appointment(/,/^\$\$ LANGUAGE plpgsql SECURITY DEFINER;/p' "$ROOT/supabase/migrations/20260802000003_fix_complete_appointment_product_overwrite.sql" > "$TMP/complete.sql"
sed -n '/^CREATE OR REPLACE FUNCTION public.settle_queue_ticket(/,/^\$\$;/p' "$ROOT/supabase/migrations/20260910190000_queue_settle_origin_professional.sql" > "$TMP/settle.sql"
"${PSQL[@]}" -f "$TMP/complete.sql"
"${PSQL[@]}" -f "$TMP/settle.sql"
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261104181642_chair_hour_stage1.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/chair_hour_legacy.test.sql"
