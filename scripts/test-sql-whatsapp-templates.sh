#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55525}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
MIG="$ROOT/supabase/migrations/20261025121520_whatsapp_message_templates.sql"
RB="$ROOT/docs/rollbacks/20261025121520_whatsapp_message_templates.rollback.sql"
P -f "$ROOT/supabase/tests/whatsapp_message_templates.harness.sql"
state() { P -At -c "SELECT 'fn ' || p.oid::regprocedure::text || ' ' || md5(pg_get_functiondef(p.oid)) || ' ' || COALESCE(p.proacl::text,'NULL') FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace UNION ALL SELECT 'table ' || tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1"; }
before="$(state)"
P -f "$MIG"
P -f "$ROOT/supabase/tests/whatsapp_message_templates.test.sql"
P -f "$RB"
P -f "$RB"
after="$(state)"
[ "$before" = "$after" ] || { echo 'FAIL: rollback não restaurou o schema anterior'; exit 1; }
P -f "$MIG"
echo 'PASS: rollback executado 2x, schema anterior preservado, migration reaplicada'
