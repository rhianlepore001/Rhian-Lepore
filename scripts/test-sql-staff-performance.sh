#!/usr/bin/env bash
# P1: get_staff_performance_v1 / get_commission_cycle_v1 num Postgres local descartável
# (nunca o Supabase de prod), com a fixture da seção 5 do ACCEPTANCE.md.
#   scripts/test-sql-staff-performance.sh            # harness + migration (2x) + testes
#   scripts/test-sql-staff-performance.sh --main     # sem a migration: deve FALHAR
#   scripts/test-sql-staff-performance.sh --rollback # migration → rollback → migration + testes; funções antigas intactas
#   scripts/test-sql-staff-performance.sh --bench    # tempo das funções com 12 mil atendimentos (R9.4)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55472}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses='' -c timezone=UTC" -l "$TMP/log" start >/dev/null
PSQL=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
MIG="$ROOT/supabase/migrations/20261003110000_staff_performance_v1.sql"
RB="$ROOT/docs/rollbacks/20261003110000_staff_performance_v1_rollback.sql"
snapshot() { "${PSQL[@]}" -At -c "SELECT string_agg(p.oid::regprocedure::text || '=' || md5(pg_get_functiondef(p.oid)), ' ' ORDER BY 1) FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname NOT IN ('get_staff_performance_v1','get_commission_cycle_v1','_staff_performance_core','_commission_cycle_core','_staff_perf_raw','_staff_perf_tz','_commission_settle_date')"; }
"${PSQL[@]}" -f "$ROOT/supabase/tests/staff_performance.harness.sql"
BEFORE="$(snapshot)"
MODE="${1:-}"
if [ "$MODE" != "--main" ]; then
  "${PSQL[@]}" -f "$MIG"
  "${PSQL[@]}" -f "$MIG" # idempotência
fi
if [ "$MODE" = "--rollback" ]; then
  "${PSQL[@]}" -f "$RB"
  LEFT="$("${PSQL[@]}" -At -c "SELECT (SELECT count(*) FROM pg_proc WHERE proname IN ('get_staff_performance_v1','get_commission_cycle_v1','_staff_performance_core','_commission_cycle_core','_staff_perf_raw','_staff_perf_tz','_commission_settle_date')) + (SELECT count(*) FROM pg_indexes WHERE indexname IN ('idx_appointments_user_client_time','idx_product_sales_finance_record_id'))")"
  [ "$LEFT" = "0" ] || { echo "FAIL rollback deixou $LEFT objetos"; exit 1; }
  echo "PASS rollback: 7 funções e 2 índices removidos"
  "${PSQL[@]}" -f "$MIG"
  echo "PASS reaplicação depois do rollback"
fi
AFTER="$(snapshot)"
[ "$BEFORE" = "$AFTER" ] || { echo "FAIL a migration alterou função existente"; diff <(tr ' ' '\n' <<<"$BEFORE") <(tr ' ' '\n' <<<"$AFTER"); exit 1; }
echo "PASS funções existentes com md5 inalterado"
if [ "$MODE" = "--bench" ]; then
  "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/staff_performance.bench.sql" 2>&1 | grep -E "^Time:|ERROR"
  exit 0
fi
"${PSQL[@]}" -At -f "$ROOT/supabase/tests/staff_performance.test.sql" 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /; s/^NOTICE:  /  /'
