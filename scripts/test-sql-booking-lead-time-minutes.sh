#!/usr/bin/env bash
# Testa 20261013200100_booking_lead_time_minutes num Postgres local descartável.
#   scripts/test-sql-booking-lead-time-minutes.sh             # md5=prod → teste FALHA → migration 2x → passa
#   scripts/test-sql-booking-lead-time-minutes.sh --rollback  # migration + rollback = estado anterior
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -x "$PGBIN/psql" ] || { echo "Postgres local não encontrado (PGBIN)."; exit 1; }
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55509}"
MIG="$ROOT/supabase/migrations/20261013200100_booking_lead_time_minutes.sql"
RB="$ROOT/docs/rollbacks/20261013200100_booking_lead_time_minutes.rollback.sql"
TEST="$ROOT/supabase/tests/booking_lead_time_minutes.test.sql"
export PGOPTIONS="-c client_min_messages=warning"
stop() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP/data"; }
cleanup() { stop; rm -rf "$TMP"; }
trap cleanup EXIT
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

PROD="business_timezone(text) 9b39e7aaf40ad4a4d8b06a51d25f3f94;enforce_lead_time_on_public_bookings() 4befcd5bf439cb553cdbe528f586ef30;get_available_slots_v2(uuid,date,uuid,integer,boolean) e4c417d6b16e0dc5a53ec0355f261711;public_booking_lead_time_hours(text) 231aeea1ef544978c1922b6fbaa61ac5"
# Cadeia que reproduz prod para as funções de antecedência.
setup() {
  stop
  "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
  "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses='' -c wal_level=logical" -l "$TMP/log" start >/dev/null
  P -f "$ROOT/supabase/tests/booking_completed_noshow.harness.sql"
  P -f "$ROOT/supabase/migrations/20261004072408_public_booking_completed_noshow.sql"
  P -f "$ROOT/supabase/tests/booking_cancel_cutoff.harness.sql"
  P -f "$ROOT/supabase/migrations/20261004082633_client_cancel_cutoff.sql"
  P -f "$ROOT/supabase/tests/booking_edit_request.harness.sql"
  P -f "$ROOT/supabase/migrations/20261004101021_client_edit_request.sql"
  P -f "$ROOT/supabase/tests/booking_notifications.harness.sql"
  P -f "$ROOT/supabase/migrations/20261004112214_booking_notifications.sql"
  P -f "$ROOT/supabase/migrations/20261006082806_notifications_type_check_allow_used_types.sql"
  P -f "$ROOT/supabase/tests/auto_confirm_online_bookings.harness.sql"
  P -f "$ROOT/supabase/migrations/20261011161117_auto_confirm_online_bookings.sql"
  P -f "$ROOT/supabase/tests/booking_lead_time_minutes.harness.sql"
  # md5 de prod (lcqwrngscsziysyfhpfj, 2026-10-13)
  got="$(P -At -c "SELECT string_agg(p.oid::regprocedure::text || ' ' || md5(pg_get_functiondef(p.oid)), ';' ORDER BY 1) FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname IN ('get_available_slots_v2','enforce_lead_time_on_public_bookings','public_booking_lead_time_hours','business_timezone')")"
  [ "$got" = "$PROD" ] || { echo "md5 local != prod: $got"; exit 1; }
}
state() {
  P -At -c "SELECT p.oid::regprocedure::text || ' ' || md5(pg_get_functiondef(p.oid)) || ' ' || COALESCE(p.proacl::text,'NULL') || ' ' || p.prosecdef
            FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
            UNION ALL SELECT 'col ' || table_name || '.' || column_name || ' ' || data_type || ' ' || COALESCE(column_default,'-') || ' ' || is_nullable
            FROM information_schema.columns WHERE table_schema='public'
            UNION ALL SELECT 'con ' || conrelid::regclass::text || ' ' || conname FROM pg_constraint WHERE connamespace='public'::regnamespace
            ORDER BY 1"
}

if [ "${1:-}" = "--rollback" ]; then
  setup
  before="$(state)"
  P -f "$MIG"; P -f "$MIG"; P -f "$RB"; P -f "$RB"
  after="$(state)"
  [ "$before" = "$after" ] || { echo "rollback: estado diferente:"; diff <(echo "$before") <(echo "$after") || true; exit 1; }
  echo "rollback ok: funções (md5 + ACL + secdef), colunas e constraints = prod; idempotente"
  exit 0
fi

setup
echo "md5 = prod: get_available_slots_v2, enforce_lead_time_on_public_bookings, public_booking_lead_time_hours, business_timezone"
P -f "$TEST" > "$TMP/before.out" 2>&1 || true
if ! grep -q FAIL "$TMP/before.out"; then echo "ERRO: deveria falhar antes da migration"; cat "$TMP/before.out"; exit 1; fi
echo "antes da migration (esperado FAIL):"; grep -oE "(PASS|FAIL)  .*" "$TMP/before.out" | sed 's/^/  /'
before="$(state | grep -vE 'get_available_slots_v2|enforce_lead_time_on_public_bookings|booking_lead_time_minutes|public_booking_lead_time_minutes')"
P -f "$MIG"; P -f "$MIG"
echo "migration aplicada 2x"
after="$(state | grep -vE 'get_available_slots_v2|enforce_lead_time_on_public_bookings|booking_lead_time_minutes|public_booking_lead_time_minutes')"
[ "$before" = "$after" ] || { echo "migration alterou algo fora do escopo:"; diff <(echo "$before") <(echo "$after"); exit 1; }
echo "fora do escopo intocado"
echo "ACL v2: $(P -At -c "SELECT proacl::text FROM pg_proc WHERE oid='public.get_available_slots_v2(uuid,date,uuid,integer,boolean)'::regprocedure")"
echo "ACL interna: $(P -At -c "SELECT proacl::text || ' secdef=' || prosecdef FROM pg_proc WHERE proname='public_booking_lead_time_minutes'")"
P -f "$TEST" > "$TMP/after.out" 2>&1 || { cat "$TMP/after.out"; exit 1; }
grep -oE "(PASS|FAIL)  .*" "$TMP/after.out" | sed 's/^/  /'
if grep -q FAIL "$TMP/after.out"; then echo "há FAIL"; exit 1; fi
n="$(grep -c PASS "$TMP/after.out")"; [ "$n" -ge 18 ] || { echo "esperado ≥18 checks, veio $n"; exit 1; }
echo "booking_lead_time_minutes: $n checks ok; md5=prod; TDD; idempotente; fora do escopo intocado"
