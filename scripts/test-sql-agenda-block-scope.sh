#!/usr/bin/env bash
# Testa 20261007140000_agenda_block_scope (bloqueio de agenda com 3 opções) num Postgres
# local descartável (não usa nem toca o Supabase de prod).
#   scripts/test-sql-agenda-block-scope.sh             # cadeia = prod (md5) → teste FALHA → migration 2x → passa + regressões de bloqueio/fila
#   scripts/test-sql-agenda-block-scope.sh --rollback  # migration + rollback: função/colunas/triggers voltam byte a byte a prod
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/psql" ]; then
  echo "Postgres local não encontrado (PGBIN). Instale postgresql e rode de novo."
  exit 1
fi
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55503}"
MIG="$ROOT/supabase/migrations/20261007140000_agenda_block_scope.sql"
RB="$ROOT/docs/rollbacks/20261007140000_agenda_block_scope.rollback.sql"
HARNESS="$ROOT/supabase/tests/agenda_block_scope.harness.sql"
TEST="$ROOT/supabase/tests/agenda_block_scope.test.sql"
# pg_get_functiondef em prod (lcqwrngscsziysyfhpfj), lido em 2026-10-07 (só SELECT).
PROD_MD5="agenda_interval_blocked=37fc24c18a3e92c61704a91cf99cf79c create_agenda_block=e8296d3348ac95130ff88e3b4b0fc472 delete_agenda_block=2bdda9b45e9e3206937a47b93b8ffb2c enforce_agenda_block_on_appointments=cd5760bf5b337478773d4fdef58c69ee enforce_agenda_block_on_public_bookings=3f1d429f1835299c5a8688a437282fb5 settle_queue_ticket=9beff6dd74690576b26f9489265ffdb2 staff_can_manage_agenda_block=98221a8702f82d16262de5273e918073"
PROD_SCMAB_SIG="{postgres=X/postgres,service_role=X/postgres} true s search_path=public postgres"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
export PGOPTIONS="-c client_min_messages=warning"
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
for f in "$MIG" "$RB" "$HARNESS" "$TEST"; do [ -f "$f" ] || { echo "faltou $f"; exit 1; }; done

md5s() { P -At -c "SELECT string_agg(proname || '=' || md5(pg_get_functiondef(oid)), ' ' ORDER BY proname) FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname IN ('agenda_interval_blocked','create_agenda_block','delete_agenda_block','enforce_agenda_block_on_appointments','enforce_agenda_block_on_public_bookings','settle_queue_ticket','staff_can_manage_agenda_block')"; }
scmab_sig() { P -At -c "SELECT proacl::text || ' ' || prosecdef || ' ' || provolatile::text || ' ' || array_to_string(proconfig, ',') || ' ' || pg_get_userbyid(proowner) FROM pg_proc WHERE oid = 'public.staff_can_manage_agenda_block(uuid)'::regprocedure"; }
schema_state() { P -At -c "SELECT (SELECT string_agg(column_name || ':' || data_type || ':' || COALESCE(column_default, '') || ':' || is_nullable, ',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'business_settings') || ' | ' || COALESCE((SELECT string_agg(conname || ':' || pg_get_constraintdef(oid), ',' ORDER BY conname) FROM pg_constraint WHERE conrelid = 'public.business_settings'::regclass), '') || ' | ' || COALESCE((SELECT string_agg(tgname, ',' ORDER BY tgname) FROM pg_trigger WHERE tgrelid = 'public.business_settings'::regclass AND NOT tgisinternal), 'no-triggers') || ' | sync fn: ' || (to_regprocedure('public.sync_staff_agenda_block_scope()') IS NOT NULL)::text || ' | ' || md5(prosrc) FROM pg_proc WHERE oid = 'public.staff_can_manage_agenda_block(uuid)'::regprocedure"; }

# Cada cenário num cluster novo (os harnesses criam roles globais).
chain() {
  "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$TMP/data"
  "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
  "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
  P -f "$ROOT/supabase/tests/noshow_slots.harness.sql"
  P -f "$ROOT/docs/rollbacks/20260925160000_noshow_frees_slot_rollback.sql"
  P -f "$ROOT/supabase/migrations/20260925160000_noshow_frees_slot.sql"
  P -f "$ROOT/supabase/tests/agenda_blocks.harness.sql"
  P -f "$ROOT/supabase/migrations/20261002120000_agenda_blocks.sql"
  P -f "$ROOT/supabase/tests/agenda_blocks_queue_settle.harness.sql"
  P -f "$ROOT/supabase/migrations/20261003090000_agenda_blocks_allow_queue_completed.sql"
  P -f "$ROOT/supabase/tests/agenda_blocks_followup.harness.sql"
  P -f "$ROOT/supabase/migrations/20261003120000_agenda_blocks_acceptance_followup.sql"
  local got; got="$(md5s)"
  [ "$got" = "$PROD_MD5" ] || { echo "cadeia local != prod: $got"; exit 1; }
  [ "$(scmab_sig)" = "$PROD_SCMAB_SIG" ] || { echo "staff_can_manage_agenda_block: ACL/definer/search_path != prod: $(scmab_sig)"; exit 1; }
}
fresh() { chain; P -f "$HARNESS"; }

if [ "${1:-}" = "--rollback" ]; then
  fresh
  H="$(schema_state)"; HM="$(md5s)"
  P -f "$MIG"; P -f "$MIG"
  # escolhas feitas depois da migration: A = todas, B = própria, C = nenhuma
  P -c "UPDATE business_settings SET staff_agenda_block_scope = 'all' WHERE user_id = '00000000-0000-0000-0000-0000000000a0'"
  P -c "UPDATE business_settings SET staff_agenda_block_scope = 'none' WHERE user_id = '00000000-0000-0000-0000-0000000000c0'"
  P -c "INSERT INTO agenda_blocks (user_id, professional_id, starts_at, ends_at) VALUES ('00000000-0000-0000-0000-0000000000a0','a0000000-0000-0000-0000-0000000000f1', now() + interval '3 days', now() + interval '3 days 1 hour')"
  P -f "$RB"; P -f "$RB"
  R="$(schema_state)"; RM="$(md5s)"
  echo "após rollback: md5 $([ "$RM" = "$HM" ] && echo '= prod' || echo "DIFF $RM")"
  [ "$R" = "$H" ] || { echo "rollback não restaurou o schema:"; echo " antes: $H"; echo " depois: $R"; exit 1; }
  [ "$RM" = "$PROD_MD5" ] || { echo "rollback não restaurou as funções"; exit 1; }
  [ "$(scmab_sig)" = "$PROD_SCMAB_SIG" ] || { echo "rollback mudou ACL/definer: $(scmab_sig)"; exit 1; }
  flags="$(P -At -c "SELECT string_agg(right(user_id, 2) || '=' || staff_can_block_agenda, ',' ORDER BY user_id) FROM business_settings")"
  blocks="$(P -At -c "SELECT count(*) FROM agenda_blocks")"
  echo "booleano após rollback: $flags; bloqueios: $blocks"
  [ "$flags" = "a0=true,b0=true,c0=false" ] || { echo "rollback não preservou a escolha no booleano"; exit 1; }
  [ "$blocks" = 1 ] || { echo "rollback mexeu em bloqueios"; exit 1; }
  echo "rollback ok (função byte a byte = prod; coluna/CHECK/trigger removidos; escolha preservada no booleano)"
  exit 0
fi

fresh
echo "cadeia local = prod (md5 de 7 funções + ACL/definer/search_path)"
# Estado de main + só a coluna (sem trigger e sem a regra nova na função): o teste deve FALHAR
# nos comportamentos novos (none/all, ex-staff, sincronia), não por erro de coluna.
P -c "ALTER TABLE public.business_settings ADD COLUMN staff_agenda_block_scope text NOT NULL DEFAULT 'own'"
if P -f "$TEST" > "$TMP/before.out" 2>&1; then
  echo "ERRO: o teste deveria falhar antes da migration"; cat "$TMP/before.out"; exit 1
fi
echo "antes da migration (só a coluna; esperado FAIL): $(grep -c '| FAIL' "$TMP/before.out") checks falham, ex.:"
grep -E '\| FAIL' "$TMP/before.out" | cut -d'|' -f1 | head -12 | sed 's/^ */  - /' || true
grep -E '^psql:.*ERROR' "$TMP/before.out" | grep -v 'tests failed' | sed 's/^/  /' || true

fresh
P -f "$MIG"; P -f "$MIG"
after="$(md5s)"
echo "migration aplicada 2x"
# create/delete/trigger/fila intocados; só staff_can_manage_agenda_block muda
[ "$(echo "$after" | sed 's/ staff_can_manage_agenda_block=.*//')" = "$(echo "$PROD_MD5" | sed 's/ staff_can_manage_agenda_block=.*//')" ] || { echo "migration mexeu em função que não devia: $after"; exit 1; }
[ "$after" != "$PROD_MD5" ] || { echo "migration não mudou staff_can_manage_agenda_block"; exit 1; }
[ "$(scmab_sig)" = "$PROD_SCMAB_SIG" ] || { echo "migration mudou ACL/definer/search_path/dono: $(scmab_sig)"; exit 1; }
echo "create/delete_agenda_block, agenda_interval_blocked, triggers e settle_queue_ticket = prod; ACL/definer/search_path/dono preservados"
P -f "$TEST" > "$TMP/test.out" 2>&1 || { cat "$TMP/test.out"; exit 1; }
grep -c '| ok' "$TMP/test.out" | sed 's/^/  checks ok: /'
echo "agenda_block_scope.test ok"

# Regressões com a migration aplicada, cada uma num cluster novo com as funções reais de prod.
fresh_mig() { chain; P -f "$MIG"; }
fresh_mig
P -f "$ROOT/supabase/tests/agenda_blocks.test.sql" > "$TMP/r1.out" 2>&1 || { cat "$TMP/r1.out"; exit 1; }
echo "regressão agenda_blocks.test (bloqueio impede agendamento/pedido online/slots; flag false = forbidden) ok"
fresh_mig
P -f "$ROOT/supabase/tests/agenda_blocks_followup.test.sql" > "$TMP/r2.out" 2>&1 || { cat "$TMP/r2.out"; exit 1; }
echo "regressão agenda_blocks_followup.test (conflitos/confirmação de lista) ok"
fresh_mig
P -f "$ROOT/supabase/tests/agenda_blocks_queue_settle.test.sql" > "$TMP/r3.out" 2>&1 || { cat "$TMP/r3.out"; exit 1; }
echo "regressão agenda_blocks_queue_settle.test (fila finaliza dentro de bloqueio) ok"
echo "agenda block scope: testes ok"
