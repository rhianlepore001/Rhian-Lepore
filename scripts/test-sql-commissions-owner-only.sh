#!/usr/bin/env bash
# P-SEC: prova, num Postgres local e descartável (nunca o Supabase de prod), que
# as 3 RPCs de comissão passam a exigir o dono e que o resto não muda.
#   scripts/test-sql-commissions-owner-only.sh             # harness (md5 de prod) + migration (2x) + testes
#   scripts/test-sql-commissions-owner-only.sh --main      # sem a migration (estado de prod hoje): deve FALHAR
#   scripts/test-sql-commissions-owner-only.sh --rollback  # migration + rollback: md5 idêntico ao de prod
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55471}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
PSQL=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
MIG="$ROOT/supabase/migrations/20260929110000_commissions_owner_only.sql"
RB="$ROOT/docs/rollbacks/20260929110000_commissions_owner_only_rollback.sql"
# md5(pg_get_functiondef) em prod, lido em 29/09/2026 via SELECT
declare -A PROD_MD5=(
  ["get_commissions_due()"]="1bc9f34247a83770550e0be36b7fd3dd"
  ["get_professional_commission_details(uuid,uuid,date,date)"]="0786c74526378c31e3f2b79327795bd0"
  ["get_professional_finance_summary(uuid,uuid,date,date)"]="5bddbd851bd951479dd344ad59da03cf"
)
check_prod_md5() {
  local label="$1" f got
  for f in "${!PROD_MD5[@]}"; do
    got="$("${PSQL[@]}" -At -c "SELECT md5(pg_get_functiondef('public.$f'::regprocedure))")"
    [ "$got" = "${PROD_MD5[$f]}" ] || { echo "FAIL $label: $f md5 $got (esperado ${PROD_MD5[$f]})"; exit 1; }
  done
  echo "PASS $label: as 3 RPCs têm o md5 de prod"
}
"${PSQL[@]}" -f "$ROOT/supabase/tests/commissions_owner_only.harness.sql"
check_prod_md5 "harness"
MODE="${1:-}"
if [ "$MODE" != "--main" ]; then
  "${PSQL[@]}" -f "$MIG"
  "${PSQL[@]}" -f "$MIG" # idempotência
fi
if [ "$MODE" = "--rollback" ]; then
  "${PSQL[@]}" -f "$RB"
  check_prod_md5 "rollback"
  exit 0
fi
"${PSQL[@]}" -At -f "$ROOT/supabase/tests/commissions_owner_only.test.sql" 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /; s/^NOTICE:  /  /'
