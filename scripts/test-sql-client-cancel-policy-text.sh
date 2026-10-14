#!/usr/bin/env bash
# Testa 20261013141521_client_cancel_policy_text num Postgres local descartável.
#   scripts/test-sql-client-cancel-policy-text.sh             # md5=prod → teste FALHA → migration 2x → passa
#   scripts/test-sql-client-cancel-policy-text.sh --rollback  # migration + rollback = estado anterior
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -x "$PGBIN/psql" ] || { echo "Postgres local não encontrado (PGBIN)."; exit 1; }
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55508}"
MIG="$ROOT/supabase/migrations/20261013141521_client_cancel_policy_text.sql"
RB="$ROOT/docs/rollbacks/20261013141521_client_cancel_policy_text.rollback.sql"
TEST="$ROOT/supabase/tests/client_cancel_policy_text.test.sql"
export PGOPTIONS="-c client_min_messages=warning"
stop() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP/data"; }
cleanup() { stop; rm -rf "$TMP"; }
trap cleanup EXIT
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

# Cadeia que reproduz get_public_business_settings_json de prod (inclui auto-confirm).
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
  got="$(P -At -c "SELECT md5(pg_get_functiondef('public.get_public_business_settings_json(uuid)'::regprocedure))")"
  # prod lcqwrngscsziysyfhpfj, 2026-10-13
  [ "$got" = "5422761fd6983134c8b03b144c24d542" ] || { echo "md5 local != prod: $got"; exit 1; }
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
echo "get_public_business_settings_json md5 = prod"
if P -f "$TEST" > "$TMP/before.out" 2>&1; then echo "ERRO: deveria falhar antes da migration"; cat "$TMP/before.out"; exit 1; fi
echo "antes da migration (esperado FAIL):"; grep -oE "(PASS|FAIL)  .*|checks falharam.*" "$TMP/before.out" | sed 's/^/  /'
before="$(state | grep -v 'get_public_business_settings_json' | grep -v client_cancel_policy_text)"
P -f "$MIG"; P -f "$MIG"
echo "migration aplicada 2x"
after="$(state | grep -v 'get_public_business_settings_json' | grep -v client_cancel_policy_text)"
[ "$before" = "$after" ] || { echo "migration alterou algo fora do escopo:"; diff <(echo "$before") <(echo "$after"); exit 1; }
echo "fora do escopo intocado"
echo "ACL: $(P -At -c "SELECT proacl::text FROM pg_proc WHERE oid='public.get_public_business_settings_json(uuid)'::regprocedure")"
P -f "$TEST" > "$TMP/after.out" 2>&1 || { cat "$TMP/after.out"; exit 1; }
grep -oE "(PASS|FAIL)  .*" "$TMP/after.out" | sed 's/^/  /'
if grep -q "FAIL" "$TMP/after.out"; then echo "há FAIL"; exit 1; fi
echo "client_cancel_policy_text: $(grep -c PASS "$TMP/after.out") checks ok"
echo "client_cancel_policy_text: md5=prod; TDD (falha antes, passa depois); idempotente; fora do escopo intocado"
