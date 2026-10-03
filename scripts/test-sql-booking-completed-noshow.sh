#!/usr/bin/env bash
# Testa 20261003220000_public_booking_completed_noshow num Postgres local descartável.
#   scripts/test-sql-booking-completed-noshow.sh             # harness -> teste FALHA -> migration 2x -> passa
#   scripts/test-sql-booking-completed-noshow.sh --rollback  # migration + rollback: some trigger/v2; #120/#121/#122 intactos
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/psql" ]; then
  echo "Postgres local não encontrado (PGBIN). Instale postgresql e rode de novo."
  exit 1
fi
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55473}"
MIG="$ROOT/supabase/migrations/20261003220000_public_booking_completed_noshow.sql"
RB="$ROOT/docs/rollbacks/20261003220000_public_booking_completed_noshow.rollback.sql"
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
BCAST_FN="SELECT to_regprocedure('public.public_bookings_broadcast()') IS NOT NULL"
CANCEL_TRG="SELECT count(*) FROM pg_trigger WHERE tgname = 'sync_public_booking_on_appointment_cancel'"
V1="SELECT to_regprocedure('public.get_client_bookings_history(text,uuid)') IS NOT NULL"

P -f "$ROOT/supabase/tests/booking_completed_noshow.harness.sql"

if [ "${1:-}" = "--rollback" ]; then
  P -f "$MIG"
  P -c "INSERT INTO public.public_bookings (id, business_id, customer_phone, customer_name, service_ids, professional_id, appointment_time, total_price, status) VALUES ('53000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a0', '351912345678', 'Ana', ARRAY['20000000-0000-0000-0000-000000000001'::uuid], '10000000-0000-0000-0000-0000000000a0', now() + interval '1 day', 35, 'no_show')"
  P -f "$RB"
  trg="$(P -At -c "SELECT count(*) FROM pg_trigger WHERE tgname = 'sync_public_booking_on_appointment_outcome'")"
  fn="$(P -At -c "SELECT to_regprocedure('public.sync_public_booking_on_appointment_outcome()') IS NULL")"
  v2="$(P -At -c "SELECT to_regprocedure('public.get_client_bookings_history_v2(text,uuid)') IS NULL")"
  der="$(P -At -c "SELECT to_regprocedure('public.derive_client_booking_status(text,uuid,text,timestamptz,uuid,text)') IS NULL")"
  noshow="$(P -At -c "SELECT count(*) FROM public.public_bookings WHERE status = 'no_show'")"
  restored="$(P -At -c "SELECT status FROM public.public_bookings WHERE id = '53000000-0000-0000-0000-000000000001'")"
  cons="$(P -At -c "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'public_bookings_status_check' AND conrelid = 'public.public_bookings'::regclass")"
  lead="$(P -At -c "$LEAD_TRG")"
  rpc="$(P -At -c "$RESCHED")"
  bcast="$(P -At -c "$BCAST_TRG")"
  bfn="$(P -At -c "$BCAST_FN")"
  cancel="$(P -At -c "$CANCEL_TRG")"
  v1="$(P -At -c "$V1")"
  echo "rollback trigger:$trg fn_gone:$fn v2_gone:$v2 derive_gone:$der noshow_rows:$noshow restored:$restored"
  echo "constraint: $cons"
  echo "intact #121 lead:$lead #120 reschedule:$rpc #122 bcast:$bcast/$bfn #98 cancel:$cancel v1:$v1"
  [ "$trg" = 0 ] && [ "$fn" = t ] && [ "$v2" = t ] && [ "$der" = t ]
  [ "$noshow" = 0 ] && [ "$restored" = confirmed ]
  echo "$cons" | grep -q no_show && { echo "constraint antiga ainda tem no_show"; exit 1; }
  echo "$cons" | grep -q completed
  [ "$lead" = 1 ] && [ "$rpc" = t ] && [ "$bcast" = 1 ] && [ "$bfn" = t ] && [ "$cancel" = 1 ] && [ "$v1" = t ]
  echo "rollback ok"
  exit 0
fi

if P -f "$ROOT/supabase/tests/booking_completed_noshow.test.sql" > "$TMP/before.out" 2>&1; then
  echo "ERRO: o teste deveria falhar antes da migration"; cat "$TMP/before.out"; exit 1
fi
echo "antes da migration (esperado FAIL):"
grep -E 'FAIL|ERROR|does not exist' "$TMP/before.out" | head -20 || true

P -f "$MIG"
P -f "$MIG"
echo "migration aplicada 2x"

P -f "$ROOT/supabase/tests/booking_completed_noshow.test.sql"
lead="$(P -At -c "$LEAD_TRG")"
rpc="$(P -At -c "$RESCHED")"
bcast="$(P -At -c "$BCAST_TRG")"
cancel="$(P -At -c "$CANCEL_TRG")"
v1="$(P -At -c "$V1")"
[ "$lead" = 1 ] || { echo "trigger #121 sumiu"; exit 1; }
[ "$rpc" = t ] || { echo "reschedule_appointment #120 sumiu"; exit 1; }
[ "$bcast" = 1 ] || { echo "broadcast #122 sumiu"; exit 1; }
[ "$cancel" = 1 ] || { echo "cancel sync #98 sumiu"; exit 1; }
[ "$v1" = t ] || { echo "get_client_bookings_history v1 sumiu"; exit 1; }
echo "completed/noshow idempotente; testes ok; #98/#120/#121/#122 e v1 intactos"
