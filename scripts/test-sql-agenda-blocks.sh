#!/usr/bin/env bash
# Testa 20261002120000_agenda_blocks num Postgres local descartável.
#   scripts/test-sql-agenda-blocks.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55459}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
PSQL=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$ROOT/supabase/tests/noshow_slots.harness.sql"
"${PSQL[@]}" -f "$ROOT/docs/rollbacks/20260925160000_noshow_frees_slot_rollback.sql"
"${PSQL[@]}" <<'SQL'
REVOKE ALL ON FUNCTION public.public_booking_slot_busy(text,timestamptz,integer,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_booking_slot_busy(text,timestamptz,integer,uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_secure_booking(uuid,uuid,text,text,text,timestamptz,text[],numeric,integer,text,uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_secure_booking(uuid,uuid,text,text,text,timestamptz,text[],numeric,integer,text,uuid,text,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid,date,uuid,integer,boolean) TO PUBLIC, anon, authenticated, service_role;
SQL
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20260925160000_noshow_frees_slot.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/agenda_blocks.harness.sql"
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261002120000_agenda_blocks.sql"
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261002120000_agenda_blocks.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/agenda_blocks.test.sql"
echo "agenda_blocks SQL tests ok"
