#!/usr/bin/env bash
# Testa 20261003101803_agenda_blocks_allow_queue_completed num Postgres local descartável.
#   scripts/test-sql-agenda-blocks-queue.sh             # baseline = live (md5) -> teste FALHA -> hotfix 2x -> teste passa + regressões
#   scripts/test-sql-agenda-blocks-queue.sh --rollback  # hotfix + rollback: trigger volta ao md5 do live
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55461}"
MIG="$ROOT/supabase/migrations/20261003101803_agenda_blocks_allow_queue_completed.sql"
RB="$ROOT/docs/rollbacks/20261003101803_agenda_blocks_allow_queue_completed_rollback.sql"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"
psql_db() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

# md5 de pg_get_functiondef no live (lido em 2026-10-03, só SELECT).
LIVE_MD5="enforce_agenda_block_on_appointments=150219aaaec7688797ec0e09229d8da5 settle_queue_ticket=9beff6dd74690576b26f9489265ffdb2"
MD5_SQL="SELECT string_agg(p.proname || '=' || md5(pg_get_functiondef(p.oid)), ' ' ORDER BY p.proname) FROM pg_proc p WHERE p.oid IN ('public.enforce_agenda_block_on_appointments()'::regprocedure, 'public.settle_queue_ticket(uuid,text,numeric,uuid,text)'::regprocedure)"

psql_db -f "$ROOT/supabase/tests/noshow_slots.harness.sql"
psql_db -f "$ROOT/docs/rollbacks/20260925160000_noshow_frees_slot_rollback.sql"
psql_db -f "$ROOT/supabase/migrations/20260925160000_noshow_frees_slot.sql"
psql_db -f "$ROOT/supabase/tests/agenda_blocks.harness.sql"
psql_db -f "$ROOT/supabase/migrations/20261002120000_agenda_blocks.sql"
psql_db -f "$ROOT/supabase/tests/agenda_blocks_queue_settle.harness.sql"
got="$(psql_db -At -c "$MD5_SQL")"
[ "$got" = "$LIVE_MD5" ] || { echo "baseline difere do live: $got"; exit 1; }
echo "baseline = live (md5 ok)"

if [ "${1:-}" = "--rollback" ]; then
  psql_db -f "$MIG"
  psql_db -f "$RB"
  got="$(psql_db -At -c "$MD5_SQL")"
  acl="$(psql_db -At -c "SELECT has_function_privilege('authenticated','public.enforce_agenda_block_on_appointments()','EXECUTE')")"
  echo "rollback md5: $([ "$got" = "$LIVE_MD5" ] && echo ok || echo "DIFF $got"); authenticated exec trigger fn: $acl"
  [ "$got" = "$LIVE_MD5" ] && [ "$acl" = f ]
  echo "rollback ok"
  exit 0
fi

if psql_db -f "$ROOT/supabase/tests/agenda_blocks_queue_settle.test.sql" > "$TMP/before.out" 2>&1; then
  cat "$TMP/before.out"; echo "ERRO: o teste deveria falhar antes do hotfix"; exit 1
fi
echo "antes do hotfix (esperado FAIL):"
grep -E 'FAIL' "$TMP/before.out" || true

psql_db -f "$MIG"
psql_db -f "$MIG"
psql_db -f "$ROOT/supabase/tests/agenda_blocks_queue_settle.test.sql"
acl="$(psql_db -At -c "SELECT has_function_privilege('authenticated','public.enforce_agenda_block_on_appointments()','EXECUTE')")"
[ "$acl" = f ] || { echo "authenticated ganhou EXECUTE no trigger: $acl"; exit 1; }
echo "hotfix idempotente; fila durante bloqueio ok; authenticated sem EXECUTE no trigger"
echo "md5 pós-hotfix: $(psql_db -At -c "$MD5_SQL")"

psql_db -c "DELETE FROM public.finance_records; DELETE FROM public.queue_entries; DELETE FROM public.appointments; DELETE FROM public.agenda_blocks;"
psql_db -f "$ROOT/supabase/tests/agenda_blocks.test.sql" | tail -2
echo "regressão agenda_blocks ok"
