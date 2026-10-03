#!/usr/bin/env bash
# Testa 20261003150000_reschedule_appointment num Postgres local descartável.
#   scripts/test-sql-reschedule.sh             # stack -> teste FALHA -> migration 2x -> passa + concorrência
#   scripts/test-sql-reschedule.sh --rollback  # migration + rollback some RPC/tabela; md5 das 3 funções intacto
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55463}"
MIG="$ROOT/supabase/migrations/20261003150000_reschedule_appointment.sql"
RB="$ROOT/docs/rollbacks/20261003150000_reschedule_appointment.rollback.sql"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

MD5_SQL="SELECT string_agg(p.proname || '=' || md5(pg_get_functiondef(p.oid)), ' ' ORDER BY p.proname)
FROM pg_proc p
WHERE p.oid IN (
  'public.create_secure_booking(uuid,uuid,text,text,text,timestamptz,text[],numeric,integer,text,uuid,text,text,text)'::regprocedure,
  'public.enforce_staff_appointment_edit_scope()'::regprocedure,
  'public.enforce_agenda_block_on_appointments()'::regprocedure
)"

stack() {
  P -f "$ROOT/supabase/tests/noshow_slots.harness.sql"
  P -f "$ROOT/docs/rollbacks/20260925160000_noshow_frees_slot_rollback.sql"
  P -f "$ROOT/supabase/migrations/20260925160000_noshow_frees_slot.sql"
  P -f "$ROOT/supabase/tests/agenda_blocks.harness.sql"
  P -f "$ROOT/supabase/migrations/20261002120000_agenda_blocks.sql"
  P -f "$ROOT/supabase/migrations/20261003090000_agenda_blocks_allow_queue_completed.sql"
  P -f "$ROOT/supabase/tests/agenda_blocks_followup.harness.sql"
  P -f "$ROOT/supabase/migrations/20261003120000_agenda_blocks_acceptance_followup.sql"
  P -f "$ROOT/supabase/migrations/20260925140000_staff_appointment_edit_scope.sql"
  P -f "$ROOT/supabase/tests/reschedule_appointment.harness.sql"
}

stack
BEFORE="$(P -At -c "$MD5_SQL")"
echo "baseline md5 (não podem mudar): $BEFORE"
echo "$BEFORE" | grep -q 'create_secure_booking=' || { echo "faltou create_secure_booking no md5"; exit 1; }
echo "$BEFORE" | grep -q 'enforce_staff_appointment_edit_scope=' || { echo "faltou enforce_staff_appointment_edit_scope no md5"; exit 1; }
echo "$BEFORE" | grep -q 'enforce_agenda_block_on_appointments=' || { echo "faltou enforce_agenda_block_on_appointments no md5"; exit 1; }

if [ "${1:-}" = "--rollback" ]; then
  P -f "$MIG"
  P -f "$RB"
  AFTER="$(P -At -c "$MD5_SQL")"
  gone_fn="$(P -At -c "SELECT to_regprocedure('public.reschedule_appointment(uuid,timestamptz,uuid)') IS NULL")"
  gone_tbl="$(P -At -c "SELECT to_regclass('public.appointment_reschedules') IS NULL")"
  echo "rollback md5: $([ "$AFTER" = "$BEFORE" ] && echo ok || echo "DIFF $AFTER")"
  echo "rpc gone: $gone_fn; table gone: $gone_tbl"
  [ "$AFTER" = "$BEFORE" ] && [ "$gone_fn" = t ] && [ "$gone_tbl" = t ]
  echo "rollback ok"
  exit 0
fi

if P -f "$ROOT/supabase/tests/reschedule_appointment.test.sql" > "$TMP/before.out" 2>&1; then
  echo "ERRO: o teste deveria falhar antes da migration"
  cat "$TMP/before.out"
  exit 1
fi
echo "antes da migration (esperado FAIL):"
grep -E 'FAIL|ERROR|EXCEPTION' "$TMP/before.out" | head -20 || true

P -f "$MIG"
P -f "$MIG"
AFTER="$(P -At -c "$MD5_SQL")"
echo "depois da migration md5: $AFTER"
[ "$AFTER" = "$BEFORE" ] || { echo "md5 das funções existentes mudou — migration não é aditiva o bastante"; exit 1; }
echo "md5 inalterado (create_secure_booking / enforce_staff_appointment_edit_scope / enforce_agenda_block_on_appointments)"

P -f "$ROOT/supabase/tests/reschedule_appointment.test.sql"
echo "reschedule idempotente; testes ok"

# C-R13: duas remarcações para o mesmo horário. A que pega a trava primeiro vence.
OWNER=00000000-0000-0000-0000-00000000000a
PRO=10000000-0000-0000-0000-000000000001
CLIENT=30000000-0000-0000-0000-000000000001
APT_A=50000000-0000-0000-0000-0000000000aa
APT_B=50000000-0000-0000-0000-0000000000bb
P -c "DELETE FROM public.appointment_reschedules; DELETE FROM public.appointments; DELETE FROM public.public_bookings; DELETE FROM public.agenda_blocks;"
P -c "INSERT INTO public.appointments (id, user_id, client_id, professional_id, service, appointment_time, status, duration_minutes, price)
      VALUES
      ('$APT_A', '$OWNER', '$CLIENT', '$PRO', 'Corte', date_trunc('hour', now()) + interval '20 days', 'Confirmed', 30, 45),
      ('$APT_B', '$OWNER', '$CLIENT', '$PRO', 'Corte', date_trunc('hour', now()) + interval '20 days 1 hour', 'Confirmed', 30, 45);"
TARGET="date_trunc('hour', now()) + interval '20 days 3 hours'"
(
  P -c "SELECT set_config('request.jwt.claim.sub','$OWNER', false);" \
    -c "BEGIN; SELECT public.reschedule_appointment('$APT_A'::uuid, $TARGET, '$PRO'::uuid); SELECT pg_sleep(4); COMMIT;"
) > "$TMP/race-a.out" 2>&1 &
sleep 1
START=$(date +%s.%N)
set +e
P -c "SELECT set_config('request.jwt.claim.sub','$OWNER', false);" \
  -c "SELECT public.reschedule_appointment('$APT_B'::uuid, $TARGET, '$PRO'::uuid);" > "$TMP/race-b.out" 2>&1
BEC=$?
set -e
wait
END=$(date +%s.%N)
ELAPSED=$(python3 -c "print(float('$END') - float('$START'))")
WINNERS=$(P -At -c "SELECT count(*) FROM public.appointments WHERE professional_id = '$PRO' AND appointment_time = $TARGET AND status IN ('Pending','Confirmed')")
echo "C-R13: segundo exit $BEC; espera ${ELAPSED}s; vencedores no slot: $WINNERS"
python3 -c "import sys; sys.exit(0 if float('$ELAPSED') > 2.5 else 1)"
[ "$WINNERS" = 1 ]
grep -E -q 'ocupado|reschedule_slot_busy' "$TMP/race-b.out"
echo "concorrência ok"
