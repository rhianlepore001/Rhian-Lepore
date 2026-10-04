#!/usr/bin/env bash
# Testa 20261004114500_booking_notifications num Postgres local descartável.
#   scripts/test-sql-booking-notifications.sh             # harness → teste FALHA → migration 2x → passa
#   scripts/test-sql-booking-notifications.sh --rollback  # migration + rollback: v2 volta ao PR-6
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/psql" ]; then
  echo "Postgres local não encontrado (PGBIN). Instale postgresql e rode de novo."
  exit 1
fi
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55487}"
MIG6="$ROOT/supabase/migrations/20261004101021_client_edit_request.sql"
MIG="$ROOT/supabase/migrations/20261004114500_booking_notifications.sql"
RB="$ROOT/docs/rollbacks/20261004114500_booking_notifications.rollback.sql"
MIG123="$ROOT/supabase/migrations/20261004072408_public_booking_completed_noshow.sql"
MIG125="$ROOT/supabase/migrations/20261004082633_client_cancel_cutoff.sql"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

[ -f "$MIG" ] || { echo "faltou migration $MIG"; exit 1; }
[ -f "$RB" ] || { echo "faltou rollback $RB"; exit 1; }
[ -f "$MIG6" ] || { echo "faltou PR-6 $MIG6"; exit 1; }

LEAD_TRG="SELECT count(*) FROM pg_trigger WHERE tgname = 'enforce_lead_time_on_public_bookings'"
RESCHED="SELECT to_regprocedure('public.reschedule_appointment(uuid,timestamptz,uuid)') IS NOT NULL"
BCAST_TRG="SELECT count(*) FROM pg_trigger WHERE tgname = 'public_bookings_broadcast_trg'"
CANCEL_TRG="SELECT count(*) FROM pg_trigger WHERE tgname = 'sync_public_booking_on_appointment_cancel'"
OUTCOME_TRG="SELECT count(*) FROM pg_trigger WHERE tgname = 'sync_public_booking_on_appointment_outcome'"
V1A="SELECT to_regprocedure('public.accept_public_booking(uuid)') IS NOT NULL"
V1R="SELECT to_regprocedure('public.reject_public_booking(uuid)') IS NOT NULL"
V2A="SELECT to_regprocedure('public.accept_public_booking_v2(uuid)') IS NOT NULL"
V2R="SELECT to_regprocedure('public.reject_public_booking_v2(uuid)') IS NOT NULL"
NOTIFY_TRG="SELECT count(*) FROM pg_trigger WHERE tgname = 'notify_public_booking_requests_trg'"

P -f "$ROOT/supabase/tests/booking_completed_noshow.harness.sql"
P -f "$MIG123"
P -f "$ROOT/supabase/tests/booking_cancel_cutoff.harness.sql"
P -f "$MIG125"
P -f "$ROOT/supabase/tests/booking_edit_request.harness.sql"
P -f "$MIG6"
P -f "$ROOT/supabase/tests/booking_notifications.harness.sql"

MD5_A6="$(P -At -c "SELECT md5(pg_get_functiondef('public.accept_public_booking_v2(uuid)'::regprocedure))")"
MD5_R6="$(P -At -c "SELECT md5(pg_get_functiondef('public.reject_public_booking_v2(uuid)'::regprocedure))")"
echo "pr6 accept_v2 md5:$MD5_A6 reject_v2 md5:$MD5_R6"

intact() {
  lead="$(P -At -c "$LEAD_TRG")"
  rpc="$(P -At -c "$RESCHED")"
  bcast="$(P -At -c "$BCAST_TRG")"
  cancel="$(P -At -c "$CANCEL_TRG")"
  outcome="$(P -At -c "$OUTCOME_TRG")"
  v1a="$(P -At -c "$V1A")"
  v1r="$(P -At -c "$V1R")"
  v2a="$(P -At -c "$V2A")"
  v2r="$(P -At -c "$V2R")"
  echo "intact #121 lead:$lead #120 reschedule:$rpc #122 bcast:$bcast #98 cancel:$cancel #123 outcome:$outcome v1a:$v1a v1r:$v1r v2a:$v2a v2r:$v2r"
  [ "$lead" = 1 ] && [ "$rpc" = t ] && [ "$bcast" = 1 ] && [ "$cancel" = 1 ]
  [ "$outcome" = 1 ] && [ "$v1a" = t ] && [ "$v1r" = t ] && [ "$v2a" = t ] && [ "$v2r" = t ]
}

grants() {
  anon_a="$(P -At -c "SELECT has_function_privilege('anon', 'public.accept_public_booking_v2(uuid)', 'EXECUTE')")"
  anon_r="$(P -At -c "SELECT has_function_privilege('anon', 'public.reject_public_booking_v2(uuid)', 'EXECUTE')")"
  auth_a="$(P -At -c "SELECT has_function_privilege('authenticated', 'public.accept_public_booking_v2(uuid)', 'EXECUTE')")"
  auth_r="$(P -At -c "SELECT has_function_privilege('authenticated', 'public.reject_public_booking_v2(uuid)', 'EXECUTE')")"
  echo "grants v2 anon a:$anon_a r:$anon_r auth a:$auth_a r:$auth_r"
  [ "$anon_a" = f ] && [ "$anon_r" = f ] && [ "$auth_a" = t ] && [ "$auth_r" = t ]
}

if [ "${1:-}" = "--rollback" ]; then
  P -f "$MIG"
  P -f "$MIG"
  P -f "$RB"
  trg="$(P -At -c "$NOTIFY_TRG")"
  fn="$(P -At -c "SELECT to_regprocedure('public.notify_public_booking_requests()') IS NULL")"
  act="$(P -At -c "SELECT to_regprocedure('public.caller_can_act_on_public_booking(public.public_bookings)') IS NULL")"
  col="$(P -At -c "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name IN ('link','booking_id','event_key')")"
  md5a="$(P -At -c "SELECT md5(pg_get_functiondef('public.accept_public_booking_v2(uuid)'::regprocedure))")"
  md5r="$(P -At -c "SELECT md5(pg_get_functiondef('public.reject_public_booking_v2(uuid)'::regprocedure))")"
  echo "rollback trg:$trg fn_gone:$fn act_gone:$act extra_cols:$col accept_md5:$md5a reject_md5:$md5r"
  [ "$trg" = 0 ] && [ "$fn" = t ] && [ "$act" = t ] && [ "$col" = 0 ]
  [ "$md5a" = "$MD5_A6" ] || { echo "rollback: accept_v2 md5 != PR-6"; exit 1; }
  [ "$md5r" = "$MD5_R6" ] || { echo "rollback: reject_v2 md5 != PR-6"; exit 1; }
  grants
  intact
  echo "rollback ok"
  exit 0
fi

if P -f "$ROOT/supabase/tests/booking_notifications.test.sql" > "$TMP/before.out" 2>&1; then
  echo "ERRO: o teste deveria falhar antes da migration"; cat "$TMP/before.out"; exit 1
fi
echo "antes da migration (esperado FAIL):"
grep -E 'FAIL|ERROR|does not exist' "$TMP/before.out" | head -20 || true

P -f "$MIG"
P -f "$MIG"
echo "migration aplicada 2x"

P -f "$ROOT/supabase/tests/booking_notifications.test.sql"
grants
intact
echo "booking notifications idempotente; testes ok; #98/#120/#121/#122/#123 intactos"
