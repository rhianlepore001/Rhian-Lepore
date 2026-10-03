#!/usr/bin/env bash
# Testa 20261003192135_public_bookings_realtime num Postgres local descartável.
#   scripts/test-sql-booking-realtime.sh             # harness -> teste FALHA -> migration 2x -> passa
#   scripts/test-sql-booking-realtime.sh --rollback  # migration + rollback: some trigger/fn/policy; #120/#121 intactos
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/psql" ]; then
  echo "Postgres local não encontrado (PGBIN). Instale postgresql e rode de novo."
  exit 1
fi
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55471}"
MIG="$ROOT/supabase/migrations/20261003192135_public_bookings_realtime.sql"
RB="$ROOT/docs/rollbacks/20261003192135_public_bookings_realtime.rollback.sql"
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
QUEUE_POL="SELECT count(*) FROM pg_policy WHERE polname = 'Queue topics are readable'"

P -f "$ROOT/supabase/tests/booking_realtime.harness.sql"

# Policy da fila (não deve ser tocada).
P -c "CREATE POLICY \"Queue topics are readable\" ON realtime.messages FOR SELECT TO anon, authenticated USING (realtime.topic() LIKE 'queue:%' AND realtime.messages.extension = 'broadcast')"

if [ "${1:-}" = "--rollback" ]; then
  P -f "$MIG"
  P -f "$RB"
  trg="$(P -At -c "SELECT count(*) FROM pg_trigger WHERE tgname = 'public_bookings_broadcast_trg'")"
  fn="$(P -At -c "SELECT to_regprocedure('public.public_bookings_broadcast()') IS NULL")"
  pol="$(P -At -c "SELECT count(*) FROM pg_policy WHERE polname = 'Booking topics are readable'")"
  pub="$(P -At -c "SELECT count(*) FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'public_bookings'")"
  lead="$(P -At -c "$LEAD_TRG")"
  rpc="$(P -At -c "$RESCHED")"
  queue="$(P -At -c "$QUEUE_POL")"
  echo "rollback trigger:$trg fn_gone:$fn policy:$pol pub:$pub lead:$lead reschedule:$rpc queue_policy:$queue"
  [ "$trg" = 0 ] && [ "$fn" = t ] && [ "$pol" = 0 ] && [ "$pub" = 0 ]
  [ "$lead" = 1 ] && [ "$rpc" = t ] && [ "$queue" = 1 ]
  echo "rollback ok"
  exit 0
fi

if P -f "$ROOT/supabase/tests/booking_realtime.test.sql" > "$TMP/before.out" 2>&1; then
  echo "ERRO: o teste deveria falhar antes da migration"; cat "$TMP/before.out"; exit 1
fi
echo "antes da migration (esperado FAIL):"
grep -E 'FAIL|ERROR|does not exist' "$TMP/before.out" | head -20 || true

P -f "$MIG"
P -f "$MIG"
echo "migration aplicada 2x"

P -f "$ROOT/supabase/tests/booking_realtime.test.sql"
queue="$(P -At -c "$QUEUE_POL")"
lead="$(P -At -c "$LEAD_TRG")"
rpc="$(P -At -c "$RESCHED")"
[ "$queue" = 1 ] || { echo "policy da fila foi alterada"; exit 1; }
[ "$lead" = 1 ] || { echo "trigger #121 sumiu"; exit 1; }
[ "$rpc" = t ] || { echo "reschedule_appointment #120 sumiu"; exit 1; }
echo "booking realtime idempotente; testes ok; #120/#121 e policy da fila intactos"
