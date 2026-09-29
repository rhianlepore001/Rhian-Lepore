#!/usr/bin/env bash
# Testa a migration 20260929090000_ex_staff_access num Postgres local e
# descartável (não usa nem toca o Supabase de prod).
#   scripts/test-sql-ex-staff-access.sh            # harness + baseline + migration (2x) + testes + verificação E3.1
#   scripts/test-sql-ex-staff-access.sh --main     # sem a migration (estado de prod hoje): deve FALHAR
#   scripts/test-sql-ex-staff-access.sh --rollback # migration + rollback: volta às definições de prod (md5)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55443}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
PSQL=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
MIG="$ROOT/supabase/migrations/20260929090000_ex_staff_access.sql"
RB="$ROOT/docs/rollbacks/20260929090000_ex_staff_access_rollback.sql"
PROD_MD5="4e27234398ff92bddb5bfb359afbc677"
md5_now() { "${PSQL[@]}" -At -c "SELECT md5(pg_get_functiondef('public.get_auth_company_id()'::regprocedure))"; }
quals() { "${PSQL[@]}" -At -c "SELECT string_agg(policyname || '=' || qual, E'\n' ORDER BY policyname) FROM pg_policies WHERE policyname IN ('Staff can read company appointments','Staff can read company services','Staff can read company team members')"; }

"${PSQL[@]}" -f "$ROOT/supabase/tests/ex_staff_access.harness.sql"
got="$(md5_now)"
[ "$got" = "$PROD_MD5" ] || { echo "FAIL md5 de prod no harness: $got (esperado $PROD_MD5)"; exit 1; }
echo "PASS harness: get_auth_company_id com o md5 de prod ($PROD_MD5)"
QUALS_PROD="$(quals)"
"${PSQL[@]}" -f "$ROOT/supabase/tests/ex_staff_access.baseline.sql"

MODE="${1:-}"
if [ "$MODE" != "--main" ]; then
  "${PSQL[@]}" -f "$MIG"
  "${PSQL[@]}" -f "$MIG" # idempotência
fi
if [ "$MODE" = "--rollback" ]; then
  "${PSQL[@]}" -f "$RB"
  got="$(md5_now)"
  [ "$got" = "$PROD_MD5" ] || { echo "FAIL rollback: md5 $got (esperado $PROD_MD5)"; exit 1; }
  [ "$(quals)" = "$QUALS_PROD" ] || { echo "FAIL rollback: policies diferentes das de prod"; quals; exit 1; }
  echo "PASS rollback: md5 e as 3 policies idênticos aos de prod"
  exit 0
fi
"${PSQL[@]}" -f "$ROOT/supabase/tests/ex_staff_access.test.sql"
if [ "$MODE" != "--main" ]; then
  # Verificação E3.1 (a mesma que roda em prod depois de aplicar): 0 divergências
  "${PSQL[@]}" -f "$ROOT/docs/rollbacks/20260929090000_ex_staff_access_verify.sql" 2>&1 | tee "$TMP/verify.log"
  grep -q "staff mantidos=4, staff cortados=4, donos divergentes=0, divergencias=0" "$TMP/verify.log" \
    && echo "PASS verificação E3.1 no harness (4 mantidos: a1,a2,a7,a8 após relink; 4 cortados: a3,a4,a5,a6)" \
    || { echo "FAIL verificação E3.1"; exit 1; }
fi
