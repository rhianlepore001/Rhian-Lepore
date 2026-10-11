#!/usr/bin/env bash
# Testa 20261011213000_fix_get_public_booking_by_id_type num Postgres 17 local descartável
# (não usa nem toca o Supabase de prod).
#   scripts/test-sql-booking-status-poll.sh             # = prod (#144 aplicada, md5) → teste FALHA → migration 2x → passa
#   scripts/test-sql-booking-status-poll.sh --rollback  # migration + rollback: função byte a byte = prod, ACL igual
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/psql" ]; then
  echo "Postgres local não encontrado (PGBIN). Instale postgresql e rode de novo."
  exit 1
fi
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55506}"
MIG="$ROOT/supabase/migrations/20261011213000_fix_get_public_booking_by_id_type.sql"
RB="$ROOT/docs/rollbacks/20261011213000_fix_get_public_booking_by_id_type.rollback.sql"
AC_HARNESS="$ROOT/supabase/tests/auto_confirm_online_bookings.harness.sql"
AC_MIG="$ROOT/supabase/migrations/20261011161117_auto_confirm_online_bookings.sql"
PBS_HARNESS="$ROOT/supabase/tests/public_bookings_security.harness.sql"
PBS_MIG="$ROOT/supabase/migrations/20261011202904_public_bookings_anon_lockdown.sql"
TEST="$ROOT/supabase/tests/booking_status_poll.test.sql"
for f in "$MIG" "$RB" "$AC_HARNESS" "$AC_MIG" "$PBS_HARNESS" "$PBS_MIG" "$TEST"; do [ -f "$f" ] || { echo "faltou $f"; exit 1; }; done
export PGOPTIONS="-c client_min_messages=warning"
stop() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP/data"; }
cleanup() { stop; rm -rf "$TMP"; }
trap cleanup EXIT
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

# pg_get_functiondef em prod (lcqwrngscsziysyfhpfj), lido em 2026-10-11 (só SELECT).
PROD_SIG="get_public_booking_by_id(uuid,uuid,text) 55be6c3d5c909db060159c59a162da13 {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres} true"
sig() { P -At -c "SELECT p.oid::regprocedure::text || ' ' || md5(pg_get_functiondef(p.oid)) || ' ' || COALESCE(p.proacl::text, 'NULL') || ' ' || p.prosecdef::text FROM pg_proc p WHERE p.oid = 'public.get_public_booking_by_id(uuid,uuid,text)'::regprocedure"; }
others() { P -At -c "SELECT md5(string_agg(p.oid::regprocedure::text || md5(pg_get_functiondef(p.oid)) || COALESCE(p.proacl::text, ''), ',' ORDER BY 1)) FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f' AND p.proname <> 'get_public_booking_by_id'"; }

eval "$(sed -n '/^chain() {/,/^}/p' "$ROOT/scripts/test-sql-auto-confirm-online-bookings.sh")"
setup() {
  chain
  P -f "$AC_HARNESS"; P -f "$AC_MIG"; P -f "$PBS_HARNESS"; P -f "$PBS_MIG"
  [ "$(sig)" = "$PROD_SIG" ] || { echo "local != prod: $(sig)"; exit 1; }
}

if [ "${1:-}" = "--rollback" ]; then
  setup
  O="$(others)"
  P -f "$MIG"; P -f "$MIG"
  P -f "$RB"; P -f "$RB"
  [ "$(sig)" = "$PROD_SIG" ] || { echo "rollback != prod: $(sig)"; exit 1; }
  [ "$(others)" = "$O" ] || { echo "rollback mexeu em outras funções"; exit 1; }
  echo "rollback ok: get_public_booking_by_id byte a byte = prod (md5 + ACL + definer); demais funções intocadas"
  exit 0
fi

setup
echo "local = prod (get_public_booking_by_id md5 + ACL; #144 aplicada)"
if P -f "$TEST" > "$TMP/before.out" 2>&1; then echo "ERRO: deveria falhar antes da migration"; cat "$TMP/before.out"; exit 1; fi
echo "antes da migration (esperado FAIL):"
grep -oE "FAIL  .*" "$TMP/before.out" | sed 's/^/  /'

setup
O="$(others)"
P -f "$MIG"; P -f "$MIG"
echo "migration aplicada 2x"
[ "$(others)" = "$O" ] || { echo "migration mexeu em outras funções"; exit 1; }
echo "demais funções intocadas; agora: $(sig)"
P -f "$TEST" > "$TMP/after.out" 2>&1 || { cat "$TMP/after.out"; exit 1; }
grep -oE "booking_status_poll: .* checks ok" "$TMP/after.out"
echo "booking status poll: testes ok"
