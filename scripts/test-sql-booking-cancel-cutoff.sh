#!/usr/bin/env bash
# Testa 20261004083800_client_cancel_cutoff num Postgres local descartável.
#   scripts/test-sql-booking-cancel-cutoff.sh             # harness #123 -> teste FALHA -> migration 2x -> passa
#   scripts/test-sql-booking-cancel-cutoff.sh --rollback  # migration + rollback: some v2/colunas; #120-#123 intactos
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/psql" ]; then
  echo "Postgres local não encontrado (PGBIN). Instale postgresql e rode de novo."
  exit 1
fi
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55483}"
MIG="$ROOT/supabase/migrations/20261004083800_client_cancel_cutoff.sql"
RB="$ROOT/docs/rollbacks/20261004083800_client_cancel_cutoff.rollback.sql"
MIG123="$ROOT/supabase/migrations/20261004072408_public_booking_completed_noshow.sql"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

[ -f "$MIG" ] || { echo "faltou migration $MIG"; exit 1; }
[ -f "$RB" ] || { echo "faltou rollback $RB"; exit 1; }

LEAD_TRG="SELECT count(*) FROM pg_trigger WHERE tgname = 'enforce_lead_time_on_public_bookings'"
RESCHED="SELECT to_regprocedure('public.reschedule_appointment(uuid,timestamptz,uuid)') IS NOT NULL"
BCAST_TRG="SELECT count(*) FROM pg_trigger WHERE tgname = 'public_bookings_broadcast_trg'"
CANCEL_TRG="SELECT count(*) FROM pg_trigger WHERE tgname = 'sync_public_booking_on_appointment_cancel'"
OUTCOME_TRG="SELECT count(*) FROM pg_trigger WHERE tgname = 'sync_public_booking_on_appointment_outcome'"
V1="SELECT to_regprocedure('public.get_client_bookings_history(text,uuid)') IS NOT NULL"
V1C="SELECT to_regprocedure('public.cancel_public_booking_by_client(uuid,text)') IS NOT NULL"
V2H="SELECT to_regprocedure('public.get_client_bookings_history_v2(text,uuid)') IS NOT NULL"

P -f "$ROOT/supabase/tests/booking_completed_noshow.harness.sql"
P -f "$MIG123"
P -f "$ROOT/supabase/tests/booking_cancel_cutoff.harness.sql"

intact() {
  lead="$(P -At -c "$LEAD_TRG")"
  rpc="$(P -At -c "$RESCHED")"
  bcast="$(P -At -c "$BCAST_TRG")"
  cancel="$(P -At -c "$CANCEL_TRG")"
  outcome="$(P -At -c "$OUTCOME_TRG")"
  v1="$(P -At -c "$V1")"
  v1c="$(P -At -c "$V1C")"
  v2h="$(P -At -c "$V2H")"
  echo "intact #121 lead:$lead #120 reschedule:$rpc #122 bcast:$bcast #98 cancel:$cancel #123 outcome:$outcome v1hist:$v1 v1cancel:$v1c v2hist:$v2h"
  [ "$lead" = 1 ] && [ "$rpc" = t ] && [ "$bcast" = 1 ] && [ "$cancel" = 1 ]
  [ "$outcome" = 1 ] && [ "$v1" = t ] && [ "$v1c" = t ] && [ "$v2h" = t ]
}

if [ "${1:-}" = "--rollback" ]; then
  P -f "$MIG"
  P -f "$MIG"
  P -f "$RB"
  v2="$(P -At -c "SELECT to_regprocedure('public.cancel_public_booking_by_client_v2(uuid,text)') IS NULL")"
  col="$(P -At -c "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='business_settings' AND column_name IN ('client_cancel_cutoff_hours','client_cancel_note')")"
  json="$(P -At -c "SELECT pg_get_functiondef('public.get_public_business_settings_json(uuid)'::regprocedure)")"
  echo "rollback v2_gone:$v2 cols:$col"
  [ "$v2" = t ] && [ "$col" = 0 ]
  echo "$json" | grep -q client_cancel_cutoff && { echo "JSON ainda expõe cutoff"; exit 1; }
  echo "$json" | grep -q timezone
  intact
  echo "rollback ok"
  exit 0
fi

if P -f "$ROOT/supabase/tests/booking_cancel_cutoff.test.sql" > "$TMP/before.out" 2>&1; then
  echo "ERRO: o teste deveria falhar antes da migration"; cat "$TMP/before.out"; exit 1
fi
echo "antes da migration (esperado FAIL):"
grep -E 'FAIL|ERROR|does not exist' "$TMP/before.out" | head -20 || true

P -f "$MIG"
P -f "$MIG"
echo "migration aplicada 2x"

P -f "$ROOT/supabase/tests/booking_cancel_cutoff.test.sql"
intact
echo "cancel cutoff idempotente; testes ok; #98/#120/#121/#122/#123 e v1 intactos"
