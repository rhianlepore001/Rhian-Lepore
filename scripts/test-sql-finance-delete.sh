#!/usr/bin/env bash
# PR-A Finance: delete_finance_transaction num Postgres local descartável (nunca prod).
#   scripts/test-sql-finance-delete.sh             # harness + migration (2x) + testes
#   scripts/test-sql-finance-delete.sh --main      # sem a migration: deve FALHAR (função inexistente)
#   scripts/test-sql-finance-delete.sh --rollback  # migration + rollback: função some
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55481}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
PSQL=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
MIG="$ROOT/supabase/migrations/20261004115121_finance_delete_transaction.sql"
RB="$ROOT/docs/rollbacks/20261004115121_finance_delete_transaction.rollback.sql"
exists() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -At -c "SELECT count(*) FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='delete_finance_transaction'"; }
"${PSQL[@]}" -f "$ROOT/supabase/tests/finance_delete_transaction.harness.sql"
[ "$(exists)" = "0" ] || { echo "FAIL harness já tinha delete_finance_transaction"; exit 1; }
echo "PASS harness: função ausente (como em prod)"
MODE="${1:-}"
if [ "$MODE" != "--main" ]; then
  "${PSQL[@]}" -f "$MIG"
  "${PSQL[@]}" -f "$MIG" # idempotência
  [ "$(exists)" = "1" ] || { echo "FAIL migration não criou a função"; exit 1; }
  echo "PASS migration idempotente"
fi
if [ "$MODE" = "--rollback" ]; then
  "${PSQL[@]}" -f "$RB"
  [ "$(exists)" = "0" ] || { echo "FAIL rollback deixou a função"; exit 1; }
  echo "PASS rollback: DROP FUNCTION (prod não tinha a RPC)"
  exit 0
fi
"${PSQL[@]}" -At -f "$ROOT/supabase/tests/finance_delete_transaction.test.sql" 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /; s/^NOTICE:  /  /'
