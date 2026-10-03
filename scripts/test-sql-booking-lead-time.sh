#!/usr/bin/env bash
# Testa 20261003152759_public_booking_lead_time num Postgres local descartável.
#   scripts/test-sql-booking-lead-time.sh             # baseline follow-up -> teste FALHA -> migration 2x -> passa + md5 intacto
#   scripts/test-sql-booking-lead-time.sh --rollback  # migration + rollback some v2/trigger; md5 das 4 funções intacto
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/psql" ]; then
  echo "Postgres local não encontrado (PGBIN). Instale postgresql e rode de novo."
  exit 1
fi
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55463}"
MIG="$ROOT/supabase/migrations/20261003152759_public_booking_lead_time.sql"
RB="$ROOT/docs/rollbacks/20261003152759_public_booking_lead_time_rollback.sql"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

MD5_SQL="SELECT string_agg(p.proname || '=' || md5(pg_get_functiondef(p.oid)), E'\n' ORDER BY p.proname)
FROM pg_proc p
WHERE p.oid IN (
  'public.create_secure_booking(uuid,uuid,text,text,text,timestamptz,text[],numeric,integer,text,uuid,text,text,text)'::regprocedure,
  'public.create_public_booking(text,text,text,uuid[],uuid,timestamptz,numeric,integer,jsonb)'::regprocedure,
  'public.get_available_slots(uuid,date,uuid,integer,boolean)'::regprocedure,
  'public.enforce_agenda_block_on_appointments()'::regprocedure
)"

P -f "$ROOT/supabase/tests/noshow_slots.harness.sql"
P -f "$ROOT/docs/rollbacks/20260925160000_noshow_frees_slot_rollback.sql"
P -f "$ROOT/supabase/migrations/20260925160000_noshow_frees_slot.sql"
P -f "$ROOT/supabase/tests/agenda_blocks.harness.sql"
P -f "$ROOT/supabase/migrations/20261002120000_agenda_blocks.sql"
P -f "$ROOT/supabase/tests/agenda_blocks_followup.harness.sql"
P -f "$ROOT/supabase/migrations/20261003120000_agenda_blocks_acceptance_followup.sql"
P -f "$ROOT/supabase/tests/booking_lead_time.harness.sql"

BASELINE="$(P -At -c "$MD5_SQL")"
echo "baseline (4 funções do follow-up):"
echo "$BASELINE"

if [ "${1:-}" = "--rollback" ]; then
  P -f "$MIG"
  P -f "$RB"
  got="$(P -At -c "$MD5_SQL")"
  v2="$(P -At -c "SELECT to_regprocedure('public.get_available_slots_v2(uuid,date,uuid,integer,boolean)') IS NULL")"
  trg="$(P -At -c "SELECT count(*) FROM pg_trigger WHERE tgname = 'enforce_lead_time_on_public_bookings'")"
  echo "rollback md5: $([ "$got" = "$BASELINE" ] && echo ok || echo "DIFF $got"); v2 gone: $v2; trigger: $trg"
  [ "$got" = "$BASELINE" ] && [ "$v2" = t ] && [ "$trg" = 0 ]
  echo "rollback ok"
  exit 0
fi

if P -f "$ROOT/supabase/tests/booking_lead_time.test.sql" > "$TMP/before.out" 2>&1; then
  echo "ERRO: o teste deveria falhar antes da migration"; exit 1
fi
echo "antes da migration (esperado FAIL):"
grep -E 'FAIL|ERROR|does not exist' "$TMP/before.out" | head -20 || true

P -f "$MIG"
P -f "$MIG"
AFTER="$(P -At -c "$MD5_SQL")"
[ "$AFTER" = "$BASELINE" ] || { echo "md5 das 4 funções mudou"; echo "got: $AFTER"; echo "want: $BASELINE"; exit 1; }
echo "md5 intacto após apply 2x"

P -f "$ROOT/supabase/tests/booking_lead_time.test.sql"
echo "lead time idempotente; testes ok"
