#!/usr/bin/env bash
# Testa 20261003102005_agenda_blocks_acceptance_followup num Postgres local descartável.
#   scripts/test-sql-agenda-blocks-followup.sh             # baseline #113 -> teste FALHA -> migration 2x -> passa + concorrência + NoShow
#   scripts/test-sql-agenda-blocks-followup.sh --rollback  # migration + rollback volta o md5 do trigger do #113
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55462}"
MIG="$ROOT/supabase/migrations/20261003102005_agenda_blocks_acceptance_followup.sql"
RB="$ROOT/docs/rollbacks/20261003102005_agenda_blocks_acceptance_followup_rollback.sql"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"
psql_db() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

LIVE_TRIGGER_MD5="150219aaaec7688797ec0e09229d8da5"
MD5_SQL="SELECT md5(pg_get_functiondef('public.enforce_agenda_block_on_appointments()'::regprocedure))"

P -f "$ROOT/supabase/tests/noshow_slots.harness.sql"
P -f "$ROOT/docs/rollbacks/20260925160000_noshow_frees_slot_rollback.sql"
P -f "$ROOT/supabase/migrations/20260925160000_noshow_frees_slot.sql"
P -f "$ROOT/supabase/tests/agenda_blocks.harness.sql"
P -f "$ROOT/supabase/migrations/20261002120000_agenda_blocks.sql"
P -f "$ROOT/supabase/tests/agenda_blocks_followup.harness.sql"
got="$(P -At -c "$MD5_SQL")"
[ "$got" = "$LIVE_TRIGGER_MD5" ] || { echo "baseline difere do #113: $got"; exit 1; }
echo "baseline = #113 (md5 do trigger ok)"

if [ "${1:-}" = "--rollback" ]; then
  P -f "$MIG"
  P -f "$RB"
  got="$(P -At -c "$MD5_SQL")"
  helper="$(P -At -c "SELECT to_regprocedure('public.agenda_any_professional_busy(text,timestamptz,timestamptz)') IS NULL")"
  idx="$(P -At -c "SELECT count(*) FROM pg_indexes WHERE indexname = 'agenda_blocks_professional_id_idx'")"
  sig="$(P -At -c "SELECT count(*) FROM pg_proc WHERE proname = 'create_agenda_block'")"
  echo "rollback trigger md5: $([ "$got" = "$LIVE_TRIGGER_MD5" ] && echo ok || echo "DIFF $got"); helper gone: $helper; index: $idx; create_agenda_block overloads: $sig"
  [ "$got" = "$LIVE_TRIGGER_MD5" ] && [ "$helper" = t ] && [ "$idx" = 0 ] && [ "$sig" = 1 ]
  echo "rollback ok"
  exit 0
fi

if P -f "$ROOT/supabase/tests/agenda_blocks_followup.test.sql" > "$TMP/before.out" 2>&1; then
  echo "ERRO: o teste deveria falhar antes da migration"; exit 1
fi
echo "antes da migration (esperado FAIL):"
grep -E 'FAIL|ERROR' "$TMP/before.out" | head -20 || true

P -f "$MIG"
P -f "$MIG"
P -f "$ROOT/supabase/tests/agenda_blocks_followup.test.sql"
echo "follow-up idempotente; testes ok"

# B-54..B-56: mesma trava. Quem segura a transação primeiro impede o outro de gravar por cima.
OWNER=00000000-0000-0000-0000-00000000000a
PRO=10000000-0000-0000-0000-000000000002
CLIENT=30000000-0000-0000-0000-000000000001
P -c "DELETE FROM public.appointments; DELETE FROM public.public_bookings; DELETE FROM public.agenda_blocks;"
(
  P -c "SELECT set_config('request.jwt.claim.sub','$OWNER', false);" \
    -c "BEGIN; SELECT public.create_agenda_block('$PRO', date_trunc('hour', now()) + interval '9 days', date_trunc('hour', now()) + interval '9 days 2 hours', false); SELECT pg_sleep(4); COMMIT;"
) > "$TMP/race-a.out" 2>&1 &
sleep 1
START=$(date +%s.%N)
set +e
P -c "INSERT INTO public.appointments (user_id, client_id, professional_id, appointment_time, status, duration_minutes) VALUES ('$OWNER','$CLIENT','$PRO', date_trunc('hour', now()) + interval '9 days 30 minutes', 'Confirmed', 30);" > "$TMP/race-b.out" 2>&1
BEC=$?
set -e
wait
END=$(date +%s.%N)
ELAPSED=$(python3 -c "print(float('$END') - float('$START'))")
INSIDE=$(P -At -c "SELECT count(*) FROM public.appointments a JOIN public.agenda_blocks b ON b.professional_id = a.professional_id AND a.appointment_time < b.ends_at AND a.appointment_time + interval '30 min' > b.starts_at WHERE a.status IN ('Pending','Confirmed')")
echo "B-55 bloqueio primeiro: insert exit $BEC; espera ${ELAPSED}s; agendamentos dentro do bloqueio: $INSIDE"
python3 -c "import sys; sys.exit(0 if float('$ELAPSED') > 2.5 else 1)"
[ "$INSIDE" = 0 ]
grep -q 'bloqueado' "$TMP/race-b.out"

# Ordem inversa: agendamento segura a trava; o bloqueio vê o conflito novo.
P -c "DELETE FROM public.appointments; DELETE FROM public.agenda_blocks;"
(
  P -c "BEGIN; INSERT INTO public.appointments (user_id, client_id, professional_id, appointment_time, status, duration_minutes) VALUES ('$OWNER','$CLIENT','$PRO', date_trunc('hour', now()) + interval '11 days', 'Confirmed', 30); SELECT pg_sleep(4); COMMIT;"
) > "$TMP/race-c.out" 2>&1 &
sleep 1
CODE=$(P -At -c "SELECT set_config('request.jwt.claim.sub','$OWNER', false); SELECT public.create_agenda_block('$PRO', date_trunc('hour', now()) + interval '11 days' - interval '15 minutes', date_trunc('hour', now()) + interval '11 days 2 hours', true, ARRAY[]::uuid[])->>'code';" | tail -1)
wait
BLOCKS=$(P -At -c "SELECT count(*) FROM public.agenda_blocks")
APPTS=$(P -At -c "SELECT count(*) FROM public.appointments WHERE status = 'Confirmed'")
echo "B-55 agendamento primeiro: código $CODE; bloqueios $BLOCKS; agendamentos $APPTS"
[ "$CODE" = "block_conflicts_changed" ]
[ "$BLOCKS" = 0 ]
[ "$APPTS" = 1 ]
echo "concorrência ok"
