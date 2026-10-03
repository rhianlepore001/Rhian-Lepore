#!/usr/bin/env bash
# Testa 20261002120000_agenda_blocks num Postgres local descartável.
#   scripts/test-sql-agenda-blocks.sh             # baseline = live (md5) + migration 2x + testes + regressão NoShow
#   scripts/test-sql-agenda-blocks.sh --rollback  # migration + rollback: volta ao md5 do live
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55459}"
MIG="$ROOT/supabase/migrations/20261002120000_agenda_blocks.sql"
RB="$ROOT/docs/rollbacks/20261002120000_agenda_blocks_rollback.sql"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"
psql_db() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d "$1" -v ON_ERROR_STOP=1 -q "${@:2}"; }

# md5 de pg_get_functiondef no live (BARBER/Beauty OS, lido em 2026-10-02).
LIVE_MD5="create_secure_booking=1a6c8588fdf8fefa7434882128c2e631 get_available_slots=44fe02b8594964dd2e8976f4fda6b465 public_booking_slot_busy=2b627d30326277b6aafe1670b5d731eb"
MD5_SQL="SELECT string_agg(p.proname || '=' || md5(pg_get_functiondef(p.oid)), ' ' ORDER BY p.proname) FROM pg_proc p WHERE p.oid IN ('public.get_available_slots(uuid,date,uuid,integer,boolean)'::regprocedure, 'public.public_booking_slot_busy(text,timestamptz,integer,uuid)'::regprocedure, 'public.create_secure_booking(uuid,uuid,text,text,text,timestamptz,text[],numeric,integer,text,uuid,text,text,text)'::regprocedure)"
UNTOUCHED_SQL="SELECT string_agg(p.proname || '=' || md5(pg_get_functiondef(p.oid)), ' ' ORDER BY p.proname) FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname IN ('get_full_dates', 'get_first_available_professional', 'create_public_booking', 'confirmed_booking_slot_released')"

# Banco no estado do live (roles/grants dos 2 roles anteriores ao 20260925160000 + ele).
baseline() {
  local db="$1"
  if [ "$db" = postgres ]; then
    psql_db "$db" -f "$ROOT/supabase/tests/noshow_slots.harness.sql"
  else
    "$PGBIN/createdb" -h "$TMP" -p "$PORT" -U postgres "$db"
    grep -v '^CREATE ROLE' "$ROOT/supabase/tests/noshow_slots.harness.sql" | psql_db "$db"
  fi
  psql_db "$db" -f "$ROOT/docs/rollbacks/20260925160000_noshow_frees_slot_rollback.sql"
  psql_db "$db" <<'SQL'
REVOKE ALL ON FUNCTION public.public_booking_slot_busy(text,timestamptz,integer,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_booking_slot_busy(text,timestamptz,integer,uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_secure_booking(uuid,uuid,text,text,text,timestamptz,text[],numeric,integer,text,uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_secure_booking(uuid,uuid,text,text,text,timestamptz,text[],numeric,integer,text,uuid,text,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid,date,uuid,integer,boolean) TO PUBLIC, anon, authenticated, service_role;
SQL
  psql_db "$db" -f "$ROOT/supabase/migrations/20260925160000_noshow_frees_slot.sql"
  local got
  got="$(psql_db "$db" -At -c "$MD5_SQL")"
  [ "$got" = "$LIVE_MD5" ] || { echo "[$db] baseline difere do live: $got"; exit 1; }
  psql_db "$db" -f "$ROOT/supabase/tests/agenda_blocks.harness.sql"
}

apply_migration() {
  local db="$1" before after
  before="$(psql_db "$db" -At -c "$UNTOUCHED_SQL")"
  psql_db "$db" -f "$MIG"
  psql_db "$db" -f "$MIG"
  after="$(psql_db "$db" -At -c "$UNTOUCHED_SQL")"
  [ "$before" = "$after" ] || { echo "[$db] migration alterou função que não devia: $after"; exit 1; }
}

baseline postgres
echo "baseline = live (md5 ok)"
apply_migration postgres
echo "migration idempotente; get_full_dates/get_first/create_public_booking intocadas"
echo "md5 pós-migration: $(psql_db postgres -At -c "$MD5_SQL")"

if [ "${1:-}" = "--rollback" ]; then
  psql_db postgres -f "$RB"
  got="$(psql_db postgres -At -c "$MD5_SQL")"
  left="$(psql_db postgres -At -c "SELECT count(*) FROM pg_proc WHERE proname IN ('agenda_interval_blocked','create_agenda_block','delete_agenda_block','staff_can_manage_agenda_block','enforce_agenda_block_on_appointments','enforce_agenda_block_on_public_bookings')")"
  tbl="$(psql_db postgres -At -c "SELECT to_regclass('public.agenda_blocks') IS NULL")"
  col="$(psql_db postgres -At -c "SELECT count(*) FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'staff_can_block_agenda'")"
  acl="$(psql_db postgres -At -c "SELECT has_function_privilege('anon','public.public_booking_slot_busy(text,timestamptz,integer,uuid)','EXECUTE')")"
  echo "rollback md5: $([ "$got" = "$LIVE_MD5" ] && echo ok || echo "DIFF $got"); leftovers: $left; table gone: $tbl; column: $col; anon slot_busy exec: $acl"
  [ "$got" = "$LIVE_MD5" ] && [ "$left" = 0 ] && [ "$tbl" = t ] && [ "$col" = 0 ] && [ "$acl" = f ]
  psql_db postgres -f "$ROOT/supabase/tests/noshow_slots.test.sql" | tail -1
  echo "agenda_blocks rollback ok"
  exit 0
fi

baseline regress
apply_migration regress
psql_db regress -f "$ROOT/supabase/tests/noshow_slots.test.sql" | tail -1
echo "regressão NoShow após a migration #113 ok"

# O arquivo de teste acompanha #117. Roda com #113 + #115 + #117 juntos.
HOTFIX="$ROOT/supabase/migrations/20261003090000_agenda_blocks_allow_queue_completed.sql"
if [ ! -f "$HOTFIX" ]; then
  HOTFIX="$TMP/20261003090000_agenda_blocks_allow_queue_completed.sql"
  git -C "$ROOT" show origin/cursor/agenda-blocks-queue-settle-e54d:supabase/migrations/20261003090000_agenda_blocks_allow_queue_completed.sql > "$HOTFIX"
fi
psql_db postgres -f "$HOTFIX"
psql_db postgres -f "$ROOT/supabase/migrations/20261003120000_agenda_blocks_acceptance_followup.sql"
psql_db postgres -f "$ROOT/supabase/tests/agenda_blocks.test.sql"
echo "agenda_blocks SQL tests ok (#113+#115+#117)"
