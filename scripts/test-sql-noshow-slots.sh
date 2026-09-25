#!/usr/bin/env bash
# Testa a migration 20260925160000_noshow_frees_slot num Postgres local e
# descartável (não usa nem toca o Supabase de prod).
#   scripts/test-sql-noshow-slots.sh            # harness + prod (rollback) + migration + testes
#   scripts/test-sql-noshow-slots.sh --main     # só as definições atuais de prod: deve FALHAR
#   scripts/test-sql-noshow-slots.sh --rollback # migration + rollback: volta às definições de prod (md5)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55449}"
MIG="$ROOT/supabase/migrations/20260925160000_noshow_frees_slot.sql"
RB="$ROOT/docs/rollbacks/20260925160000_noshow_frees_slot_rollback.sql"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
PSQL=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$ROOT/supabase/tests/noshow_slots.harness.sql"
# Baseline = definições exatas de prod (o arquivo de rollback as contém) + ACL de prod
"${PSQL[@]}" -f "$RB"
"${PSQL[@]}" <<'SQL'
REVOKE ALL ON FUNCTION public.public_booking_slot_busy(text,timestamptz,integer,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_booking_slot_busy(text,timestamptz,integer,uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_secure_booking(uuid,uuid,text,text,text,timestamptz,text[],numeric,integer,text,uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_secure_booking(uuid,uuid,text,text,text,timestamptz,text[],numeric,integer,text,uuid,text,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid,date,uuid,integer,boolean) TO PUBLIC, anon, authenticated, service_role;
SQL
MD5_SQL="SELECT string_agg(p.proname || '=' || md5(pg_get_functiondef(p.oid)), ' ' ORDER BY p.proname) FROM pg_proc p WHERE p.oid IN ('public.get_available_slots(uuid,date,uuid,integer,boolean)'::regprocedure, 'public.public_booking_slot_busy(text,timestamptz,integer,uuid)'::regprocedure, 'public.create_secure_booking(uuid,uuid,text,text,text,timestamptz,text[],numeric,integer,text,uuid,text,text,text)'::regprocedure)"
PROD_MD5="create_secure_booking=a48c008d59edf64b44396eb84634d5c1 get_available_slots=0211bd7b927fe6ebc6105d48696b1fe8 public_booking_slot_busy=f4614b33aa12e52dec3a8356482fd03f"
got="$("${PSQL[@]}" -At -c "$MD5_SQL")"
[ "$got" = "$PROD_MD5" ] || { echo "baseline difere de prod: $got"; exit 1; }
echo "baseline = prod (md5 ok)"
MODE="${1:-}"
if [ "$MODE" != "--main" ]; then
  "${PSQL[@]}" -f "$MIG"
  "${PSQL[@]}" -f "$MIG"   # idempotência
fi
if [ "$MODE" = "--rollback" ]; then
  "${PSQL[@]}" -f "$RB"
  got="$("${PSQL[@]}" -At -c "$MD5_SQL")"
  left="$("${PSQL[@]}" -At -c "SELECT count(*) FROM pg_proc WHERE proname = 'confirmed_booking_slot_released'")"
  acl="$("${PSQL[@]}" -At -c "SELECT has_function_privilege('anon','public.public_booking_slot_busy(text,timestamptz,integer,uuid)','EXECUTE')")"
  echo "rollback md5: $([ "$got" = "$PROD_MD5" ] && echo ok || echo "DIFF $got"); helper leftovers: $left; anon slot_busy exec: $acl"
  [ "$got" = "$PROD_MD5" ] && [ "$left" = 0 ] && [ "$acl" = f ]
  exit 0
fi
"${PSQL[@]}" -f "$ROOT/supabase/tests/noshow_slots.test.sql"
